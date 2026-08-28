import { moduleRegistry, findModule } from "../modules";
import { shellProfiles } from "../shells";

// MUST equal ModuleCatalog keys — update both together.
// (Backend authority: PunchedApi/Application/Modules/ModuleCatalog.cs;
// seed mirror: PunchedApi/Infrastructure/SeedData/ModuleSeedData.cs.
// Key parity is asserted on the backend by ModuleCatalogSyncTests.)
const EXPECTED_BACKEND_MODULE_KEYS = [
  "customers",
  "staff",
  "settings",
  "appointments",
  "stamps",
  "notifications",
  "serviceCatalog",
  "loyalty",
  "rewards",
  "analytics",
  "programs",
  "referral",
];

describe("catalog key parity", () => {
  it("moduleRegistry ids exactly match the expected backend module keys", () => {
    expect(moduleRegistry.map((m) => m.id)).toEqual(EXPECTED_BACKEND_MODULE_KEYS);
  });

  it("every id in shells.ts moduleOrder resolves via findModule", () => {
    for (const profile of Object.values(shellProfiles)) {
      for (const moduleId of profile.moduleOrder) {
        expect(findModule(moduleId)).toBeDefined();
      }
    }
  });
});
