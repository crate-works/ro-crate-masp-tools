/**
 * Tests for scripts/generate-mode-file.js: stripping "classes" from a mode
 * file, building a minimal mode file from a profile crate, and linking the
 * mode file from the profile crate.
 */

"use strict";

const { describe, it } = require("mocha");
const { expect } = require("chai");
const path = require("path");
const fs = require("fs");
const { ROCrate } = require("ro-crate");
const {
  MODE_ROLE_URI,
  stripClassesFromMode,
  buildMinimalModeFromProfile,
  updateProfileCrate,
} = require("../scripts/generate-mode-file");

const ROOT = path.join(__dirname, "..");

describe("Crate-O Mode File Tests", function () {
  this.timeout(15000);

  // ── Script module tests ──────────────────────────────────────────────────

  describe("generate-mode-file module", function () {
    const tmpDir = path.join(ROOT, "tmp", "mode-file-test");

    before(function () {
      if (!fs.existsSync(tmpDir)) {
        fs.mkdirSync(tmpDir, { recursive: true });
      }
    });

    after(function () {
      // Clean up temp directory
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('should strip "classes" from an existing mode file (stripClassesFromMode)', function () {
      const sourcePath = path.join(
        ROOT,
        "test_data/modes/ldac/language-data-commons-collection.json"
      );
      const sourceMode = JSON.parse(fs.readFileSync(sourcePath, "utf8"));

      const result = stripClassesFromMode(sourceMode);

      // Should not have classes
      expect(result).to.not.have.property("classes");

      // Every non-classes key from the source should be preserved verbatim.
      for (const key of Object.keys(sourceMode)) {
        if (key === "classes") continue;
        expect(result).to.have.property(key);
      }
    });

    it('should preserve all non-"classes" keys (stripClassesFromMode)', function () {
      const mockMode = {
        metadata: { name: "Test" },
        conformsToUri: ["http://example.com/profile"],
        rootDataset: { type: ["Dataset"] },
        propertyGroups: [{ name: "About", inputs: [] }],
        lookup: { Language: { module: "datapack" } },
        enabledClasses: ["Dataset"],
        classes: { Dataset: { inputs: [] } }, // this should be stripped
      };

      const result = stripClassesFromMode(mockMode);
      expect(result).to.not.have.property("classes");
      expect(Object.keys(result)).to.have.lengthOf(6);
    });

    it("should generate a minimal mode file from profile crate JSON (buildMinimalModeFromProfile)", function () {
      const profilePath = path.join(
        ROOT,
        "test_data/profiles/ro-crate/ro-crate-metadata.json"
      );
      const profileJson = JSON.parse(fs.readFileSync(profilePath, "utf8"));

      const result = buildMinimalModeFromProfile(profileJson);

      expect(result).to.not.have.property("classes");
      expect(result).to.have.property("metadata");
      expect(result.metadata.name).to.equal("RO-Crate Machine Actionable Profile");
      expect(result).to.have.property("propertyGroups").that.is.an("array");
      expect(result).to.have.property("lookup").that.is.an("object");
      expect(result).to.have.property("enabledClasses").that.is.an("array");
    });

    it("should idempotently update the profile crate (updateProfileCrate)", function () {
      // Copy a profile crate to temp dir
      const profileCratePath = path.join(tmpDir, "ro-crate-metadata.json");
      const outputModePath = path.join(tmpDir, "crate-o-mode.json");

      fs.copyFileSync(
        path.join(ROOT, "test_data/profiles/ro-crate/ro-crate-metadata.json"),
        profileCratePath
      );

      // Run twice - should only add mode descriptor once
      updateProfileCrate(profileCratePath, outputModePath);
      updateProfileCrate(profileCratePath, outputModePath);

      const crateData = JSON.parse(fs.readFileSync(profileCratePath, "utf8"));
      const graph = crateData["@graph"] || [];

      // Count mode descriptors - should be only 1
      const modeDescriptors = graph.filter((entity) => {
        const role = entity["hasRole"];
        const roles = Array.isArray(role) ? role : role ? [role] : [];
        return roles.some((r) => r["@id"] === MODE_ROLE_URI);
      });
      expect(modeDescriptors).to.have.length(1);
    });

    it("should add the mode file as a ResourceDescriptor in the profile crate (updateProfileCrate)", function () {
      const profileCratePath = path.join(tmpDir, "test-profile.json");
      const outputModePath = path.join(tmpDir, "test-crate-o-mode.json");

      // Start with fresh copy of a profile crate without mode file reference
      fs.copyFileSync(
        path.join(ROOT, "test_data/profiles/workflow/ro-crate-metadata.json"),
        profileCratePath
      );

      // Remove any existing mode descriptor to start fresh
      const crateBeforeAdd = JSON.parse(fs.readFileSync(profileCratePath, "utf8"));
      crateBeforeAdd["@graph"] = crateBeforeAdd["@graph"].filter((e) => {
        const role = e["hasRole"];
        const roles = Array.isArray(role) ? role : role ? [role] : [];
        return !roles.some((r) => r["@id"] === MODE_ROLE_URI);
      });
      fs.writeFileSync(profileCratePath, JSON.stringify(crateBeforeAdd, null, 2));

      updateProfileCrate(profileCratePath, outputModePath);

      const crateData = JSON.parse(fs.readFileSync(profileCratePath, "utf8"));
      const graph = crateData["@graph"] || [];

      // Should have a ResourceDescriptor for the mode file
      const modeDescriptor = graph.find((entity) => {
        if (entity["@type"] !== "ResourceDescriptor") return false;
        const role = entity["hasRole"];
        const roles = Array.isArray(role) ? role : role ? [role] : [];
        return roles.some((r) => r["@id"] === MODE_ROLE_URI);
      });

      expect(modeDescriptor).to.exist;
      expect(modeDescriptor["hasArtifact"]["@id"]).to.equal("test-crate-o-mode.json");
    });
  });
});
