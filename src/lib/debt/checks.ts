import type { DebtFinding, DebtCategory, Severity } from "./types";

export interface ApexClassRecord {
  Id: string;
  Name: string;
  Status: string;
  ApiVersion: number;
  LengthWithoutComments: number;
}

export interface ApexTriggerRecord {
  Id: string;
  Name: string;
  TableEnumOrId: string;
  Status: string;
}

export interface CoverageRecord {
  ApexClassOrTriggerId: string;
  ApexClassOrTriggerName: string;
  NumLinesCovered: number;
  NumLinesUncovered: number;
}

export interface ValidationRuleRecord {
  Id: string;
  EntityDefinitionId: string;
  ValidationName: string;
  Active: boolean;
  Description?: string;
}

export interface FlowDefinitionRecord {
  DeveloperName: string;
  Label: string;
  ProcessType: string;
  TriggerType?: string;
  ActiveVersionId: string | null;
  Description?: string;
}

export interface DebtScanData {
  apexClasses: ApexClassRecord[];
  inactiveApexClasses: ApexClassRecord[];
  apexTriggers: ApexTriggerRecord[];
  coverage: CoverageRecord[];
  validationRules: ValidationRuleRecord[];
  flowDefinitions: FlowDefinitionRecord[];
  orgType: "production" | "sandbox" | undefined;
}

interface CheckDefinition {
  id: string;
  category: DebtCategory;
  severity: Severity;
  title: string;
  bestPractice: string;
  remedy: string;
  evaluate: (data: DebtScanData) => DebtFinding[];
}

function isLikelyTestClass(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith("test") ||
    lower.endsWith("tests") ||
    lower.startsWith("test") ||
    lower.endsWith("testhelper") ||
    lower.endsWith("testutil") ||
    lower.endsWith("testutils") ||
    lower.endsWith("mock") ||
    lower.endsWith("mocks") ||
    lower.endsWith("fixture") ||
    lower.endsWith("stub")
  );
}

export const checks: CheckDefinition[] = [
  // ─── Apex ────────────────────────────────────────────────────────────────

  {
    id: "APEX_NO_COVERAGE",
    category: "apex",
    severity: "high",
    title: "Apex classes with no test coverage",
    bestPractice:
      "Salesforce requires a minimum of 75% overall Apex code coverage to deploy to production. Classes with zero coverage are the riskiest part of the codebase — untested code can fail silently and block deployments.",
    remedy:
      "Write unit tests for each uncovered class. Aim for meaningful assertions, not just line coverage. Start with trigger handlers and service classes as they carry the most business risk.",
    evaluate: (data) => {
      const coverageMap = new Map<string, number>();
      for (const c of data.coverage) {
        const total = c.NumLinesCovered + c.NumLinesUncovered;
        const pct = total === 0 ? 100 : Math.round((c.NumLinesCovered / total) * 100);
        coverageMap.set(c.ApexClassOrTriggerId, pct);
      }

      const uncovered = data.apexClasses.filter(
        (cls) =>
          !isLikelyTestClass(cls.Name) &&
          cls.LengthWithoutComments > 5 &&
          !coverageMap.has(cls.Id)
      );

      if (uncovered.length === 0) return [];
      return [
        {
          checkId: "APEX_NO_COVERAGE",
          category: "apex",
          severity: "high",
          title: "Apex classes with no test coverage",
          description: `${uncovered.length} active Apex class(es) have no recorded test coverage. These may block deployments and are high-risk for regressions.`,
          bestPractice:
            "Salesforce requires a minimum of 75% overall Apex code coverage to deploy to production. Classes with zero coverage are the riskiest part of the codebase.",
          remedy:
            "Write unit tests for each uncovered class. Aim for meaningful assertions, not just line coverage. Start with trigger handlers and service classes.",
          affectedItems: uncovered.map((c) => ({
            name: c.Name,
            id: c.Id,
            detail: `API v${c.ApiVersion}`,
          })),
        },
      ];
    },
  },

  {
    id: "APEX_LOW_COVERAGE",
    category: "apex",
    severity: "medium",
    title: "Apex classes below 75% coverage",
    bestPractice:
      "Salesforce enforces 75% minimum overall coverage at deployment time. Classes significantly below this threshold are fragile and will eventually block releases.",
    remedy:
      "Increase test coverage incrementally. Focus tests on business logic branches, error paths, and governor limit edge cases rather than trivial getters.",
    evaluate: (data) => {
      const coverageMap = new Map<string, { pct: number; classId: string }>();
      for (const c of data.coverage) {
        const total = c.NumLinesCovered + c.NumLinesUncovered;
        if (total === 0) continue;
        const pct = Math.round((c.NumLinesCovered / total) * 100);
        coverageMap.set(c.ApexClassOrTriggerId, { pct, classId: c.ApexClassOrTriggerId });
      }

      const low = data.apexClasses.filter((cls) => {
        if (isLikelyTestClass(cls.Name) || cls.LengthWithoutComments <= 5) return false;
        const cov = coverageMap.get(cls.Id);
        return cov !== undefined && cov.pct > 0 && cov.pct < 75;
      });

      if (low.length === 0) return [];
      return [
        {
          checkId: "APEX_LOW_COVERAGE",
          category: "apex",
          severity: "medium",
          title: "Apex classes below 75% test coverage",
          description: `${low.length} active Apex class(es) have coverage between 1–74%, putting them at risk of failing deployment gates.`,
          bestPractice:
            "Salesforce enforces 75% minimum overall coverage at deployment time. Classes below this threshold are fragile and will eventually block releases.",
          remedy:
            "Increase test coverage incrementally. Focus on business logic branches, error paths, and governor limit edge cases.",
          affectedItems: low.map((cls) => {
            const cov = coverageMap.get(cls.Id);
            return {
              name: cls.Name,
              id: cls.Id,
              detail: `${cov?.pct ?? "?"}% coverage`,
            };
          }),
        },
      ];
    },
  },

  {
    id: "APEX_OLD_API_VERSION",
    category: "apex",
    severity: "info",
    title: "Apex classes on old API versions",
    bestPractice:
      "Classes on API versions below 50.0 (Summer '20) may use deprecated behaviors, miss security improvements, and are harder to maintain. Salesforce occasionally retires very old API versions.",
    remedy:
      "Review and update the API version on old classes. Test thoroughly after bumping versions as behavior can change — especially around null handling and SOQL aggregate results.",
    evaluate: (data) => {
      const old = data.apexClasses.filter((cls) => cls.ApiVersion < 50);
      if (old.length === 0) return [];
      return [
        {
          checkId: "APEX_OLD_API_VERSION",
          category: "apex",
          severity: "info",
          title: "Apex classes on API version below 50.0",
          description: `${old.length} active Apex class(es) are on API versions older than v50.0 (Summer '20).`,
          bestPractice:
            "Classes on old API versions may use deprecated behaviors and miss security improvements.",
          remedy:
            "Review and update the API version on old classes. Test thoroughly after bumping versions.",
          affectedItems: old.map((c) => ({
            name: c.Name,
            id: c.Id,
            detail: `API v${c.ApiVersion}`,
          })),
        },
      ];
    },
  },

  {
    id: "APEX_INACTIVE_CLASS",
    category: "apex",
    severity: "info",
    title: "Inactive Apex classes",
    bestPractice:
      "Inactive Apex classes remain deployed and count against metadata limits, but are never executed. They create confusion and should be removed if no longer needed.",
    remedy:
      "Review inactive classes. Delete those that are obsolete. Reactivate those that were accidentally deactivated.",
    evaluate: (data) => {
      if (data.inactiveApexClasses.length === 0) return [];
      return [
        {
          checkId: "APEX_INACTIVE_CLASS",
          category: "apex",
          severity: "info",
          title: "Inactive Apex classes still deployed",
          description: `${data.inactiveApexClasses.length} Apex class(es) are inactive but still present in the org.`,
          bestPractice:
            "Inactive Apex classes remain deployed and count against metadata limits, but are never executed.",
          remedy:
            "Review inactive classes. Delete obsolete ones. Reactivate those accidentally deactivated.",
          affectedItems: data.inactiveApexClasses.map((c) => ({
            name: c.Name,
            id: c.Id,
            detail: `API v${c.ApiVersion}`,
          })),
        },
      ];
    },
  },

  // ─── Automation ──────────────────────────────────────────────────────────

  {
    id: "TRIGGER_MULTI_PER_OBJECT",
    category: "automation",
    severity: "medium",
    title: "Multiple Apex triggers on the same object",
    bestPractice:
      "Salesforce recommends one trigger per object. Multiple triggers on the same object execute in an indeterminate order, making it impossible to guarantee execution sequence and creating subtle bugs.",
    remedy:
      "Consolidate multiple triggers into a single trigger per object that delegates to a trigger handler class. This gives you explicit control over execution order.",
    evaluate: (data) => {
      const triggersByObject = new Map<string, ApexTriggerRecord[]>();
      for (const t of data.apexTriggers) {
        const list = triggersByObject.get(t.TableEnumOrId) || [];
        list.push(t);
        triggersByObject.set(t.TableEnumOrId, list);
      }

      const multi = Array.from(triggersByObject.entries()).filter(
        ([, triggers]) => triggers.length > 1
      );

      if (multi.length === 0) return [];
      return [
        {
          checkId: "TRIGGER_MULTI_PER_OBJECT",
          category: "automation",
          severity: "medium",
          title: "Multiple active Apex triggers on the same object",
          description: `${multi.length} SObject(s) have more than one active Apex trigger. Execution order is indeterminate.`,
          bestPractice:
            "Salesforce recommends one trigger per object. Multiple triggers execute in an indeterminate order, creating subtle bugs.",
          remedy:
            "Consolidate into a single trigger per object that delegates to a handler class for explicit execution control.",
          affectedItems: multi.map(([obj, triggers]) => ({
            name: obj,
            detail: triggers.map((t) => t.Name).join(", "),
          })),
        },
      ];
    },
  },

  {
    id: "FLOW_NO_DESCRIPTION",
    category: "automation",
    severity: "low",
    title: "Active flows with no description",
    bestPractice:
      "Every active flow should have a description explaining its purpose, trigger conditions, and any business context. Undocumented flows are impossible to safely modify or deactivate.",
    remedy:
      "Add descriptions to active flows via Flow Builder. Include: what the flow does, what triggers it, which team owns it, and any known dependencies.",
    evaluate: (data) => {
      const active = data.flowDefinitions.filter((f) => f.ActiveVersionId !== null);
      const noDesc = active.filter(
        (f) => !f.Description || f.Description.trim() === ""
      );
      if (noDesc.length === 0) return [];
      return [
        {
          checkId: "FLOW_NO_DESCRIPTION",
          category: "automation",
          severity: "low",
          title: "Active flows with no description",
          description: `${noDesc.length} active flow(s) have no description, making them opaque to anyone who didn't build them.`,
          bestPractice:
            "Every active flow should have a description explaining its purpose, trigger conditions, and business context.",
          remedy:
            "Add descriptions via Flow Builder. Include: what it does, what triggers it, which team owns it, and known dependencies.",
          affectedItems: noDesc.map((f) => ({
            name: f.Label || f.DeveloperName,
            detail: f.ProcessType,
          })),
        },
      ];
    },
  },

  {
    id: "FLOW_INACTIVE_CLUTTER",
    category: "automation",
    severity: "info",
    title: "Inactive flows deployed",
    bestPractice:
      "Inactive flows accumulate over time and create confusion about what automation is actually running. They count against metadata limits and complicate org documentation.",
    remedy:
      "Audit inactive flows. Delete those that are obsolete. Consider archiving the flow XML to version control before deleting if the logic may be needed again.",
    evaluate: (data) => {
      const inactive = data.flowDefinitions.filter((f) => f.ActiveVersionId === null);
      if (inactive.length < 10) return [];
      return [
        {
          checkId: "FLOW_INACTIVE_CLUTTER",
          category: "automation",
          severity: "info",
          title: "Inactive flows accumulating",
          description: `${inactive.length} flow definition(s) have no active version. They are deployed but not running.`,
          bestPractice:
            "Inactive flows accumulate over time and create confusion about what automation is running.",
          remedy:
            "Audit inactive flows. Delete obsolete ones. Archive flow XML to version control before deleting if logic may be reused.",
          affectedItems: inactive.map((f) => ({
            name: f.Label || f.DeveloperName,
            detail: f.ProcessType,
          })),
        },
      ];
    },
  },

  // ─── Metadata ────────────────────────────────────────────────────────────

  {
    id: "VALIDATION_RULE_INACTIVE",
    category: "metadata",
    severity: "low",
    title: "Inactive validation rules still deployed",
    bestPractice:
      "Inactive validation rules remain in the org metadata, cause confusion during audits, and suggest incomplete cleanup after configuration changes. Rules disabled temporarily are often forgotten.",
    remedy:
      "Review inactive validation rules. Delete those that are permanently retired. Document why any rule was disabled if it may be re-enabled in future.",
    evaluate: (data) => {
      if (data.validationRules.length === 0) return [];
      return [
        {
          checkId: "VALIDATION_RULE_INACTIVE",
          category: "metadata",
          severity: "low",
          title: "Inactive validation rules still deployed",
          description: `${data.validationRules.length} validation rule(s) are inactive but still present in the org metadata.`,
          bestPractice:
            "Inactive validation rules cause confusion during audits and suggest incomplete cleanup after configuration changes.",
          remedy:
            "Review inactive validation rules. Delete permanently retired ones. Document why active ones were disabled.",
          affectedItems: data.validationRules.map((r) => ({
            name: r.ValidationName,
            id: r.Id,
            detail: r.Description || "No description",
          })),
        },
      ];
    },
  },
];
