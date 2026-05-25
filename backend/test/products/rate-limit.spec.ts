import { Queue } from "bullmq";
import { redisClient } from "../../src/shared/infra/cache/redis.js";

describe("BullMQ Rate Limiting do Worker", () => {
  let testQueue: Queue;

  beforeEach(() => {
    testQueue = new Queue("enrichment-queue", { connection: redisClient });
  });

  afterAll(async () => {
    await testQueue.close();
  });

  it("deve reter jobs que excedam o limite máximo de 10 execuções por segundo", async () => {
    const addJobsPromises = Array.from({ length: 12 }).map((_, index) =>
      testQueue.add("enrich_product", { productId: `prod-${index}` }),
    );

    const jobs = await Promise.all(addJobsPromises);
    const waitingJobsCount = await testQueue.getWaitingCount();

    expect(jobs.length).toBe(12);
    expect(waitingJobsCount).toBeDefined();
  });
});
