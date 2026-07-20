import { SemanticUnderstandingEngine } from "./engine.js";
import { CustomerTwinService } from "../customerTwin/service.js";

export class SemanticUnderstandingService {
  constructor({ db = null, clock } = {}) {
    this.engine = new SemanticUnderstandingEngine({ clock });
    this.twins = new CustomerTwinService({ db, clock });
  }

  async analyze(input = {}) {
    let twin = input.twin || null;
    if (!twin && input.customerId) {
      twin = await this.twins.get(input.customerId);
    }
    return this.engine.analyze({ ...input, twin });
  }

  async process(input = {}) {
    if (!input.customerId) throw new Error("customerId is required.");
    const twin = await this.twins.get(input.customerId);
    const analysis = this.engine.analyze({ ...input, twin });

    const result = await this.twins.updateFacts({
      customerId: input.customerId,
      sessionId: input.sessionId || null,
      channel: input.channel || "web",
      actor: "cce-semantic-understanding",
      facts: analysis.facts,
    });

    return {
      analysis,
      twin: result.twin,
      changes: result.changes,
      readiness: result.readiness,
      nextBestQuestion: analysis.nextBestQuestion,
    };
  }
}
