import { z } from "zod";
import { ESCALATION_POLICY, TEAMS, TEAM_WORKLOAD } from "../data/operations.js";
import { BaseTool } from "./base.js";

export class ListTeamsTool extends BaseTool {
  name = "list_teams";
  description = "List support teams with the ticket categories and skills each one handles. Optionally filter by category.";
  schema = z.object({ category: z.string().optional() });

  async execute({ category }) {
    return { teams: category ? TEAMS.filter((t) => t.categories.includes(category)) : TEAMS };
  }
}

export class GetTeamWorkloadTool extends BaseTool {
  name = "get_team_workload";
  description = "Current queue depth, agents online and on-call person for a team id.";
  schema = z.object({ teamId: z.string() });

  async execute({ teamId }) {
    const workload = TEAM_WORKLOAD[teamId];
    if (!workload) return { error: `unknown team ${teamId}`, knownTeams: Object.keys(TEAM_WORKLOAD) };
    return { teamId, ...workload, ticketsPerAgent: workload.agentsOnline ? Math.round(workload.openTickets / workload.agentsOnline) : null };
  }
}

export class GetEscalationPolicyTool extends BaseTool {
  name = "get_escalation_policy";
  description = "Who must be notified, whether to page on-call, and the maximum unassigned time for a priority level.";
  schema = z.object({ priority: z.enum(["P1", "P2", "P3", "P4"]) });

  async execute({ priority }) {
    return { priority, ...ESCALATION_POLICY[priority] };
  }
}

export function routerTools() {
  return [new ListTeamsTool(), new GetTeamWorkloadTool(), new GetEscalationPolicyTool()];
}
