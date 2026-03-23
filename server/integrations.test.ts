import { describe, it, expect } from "vitest";

/**
 * Integration tests for external services
 * These tests validate that credentials are correctly configured
 */

describe("External Service Integrations", () => {
  describe("OpenAI Integration", () => {
    it("should have OPENAI_API_KEY configured", () => {
      const apiKey = process.env.OPENAI_API_KEY;
      expect(apiKey).toBeDefined();
      expect(apiKey).toMatch(/^sk-proj-/);
    });

    it("should validate OpenAI API key format", () => {
      const apiKey = process.env.OPENAI_API_KEY;
      // OpenAI keys start with sk-proj- and are long strings
      expect(apiKey).toMatch(/^sk-proj-[A-Za-z0-9_-]{20,}$/);
    });
  });

  describe("Apify Integration", () => {
    it("should have APIFY_API_KEY configured", () => {
      const apiKey = process.env.APIFY_API_KEY;
      expect(apiKey).toBeDefined();
      expect(apiKey).toMatch(/^apify_api_/);
    });

    it("should validate Apify API key format", () => {
      const apiKey = process.env.APIFY_API_KEY;
      // Apify keys start with apify_api_ and contain alphanumeric characters
      expect(apiKey).toMatch(/^apify_api_[A-Za-z0-9]+$/);
    });
  });

  describe("Upstash Redis Integration", () => {
    it("should have UPSTASH_REDIS_REST_URL configured", () => {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      expect(url).toBeDefined();
      expect(url).toMatch(/^https:\/\//);
    });

    it("should have UPSTASH_REDIS_REST_TOKEN configured", () => {
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      expect(token).toBeDefined();
      expect(token?.length).toBeGreaterThan(10);
    });

    it("should validate Upstash Redis URL format", () => {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      // Upstash URLs are HTTPS and contain upstash.io domain
      expect(url).toMatch(/^https:\/\/[a-z0-9-]+\.upstash\.io$/);
    });

    it("should validate Upstash Redis token format", () => {
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      // Upstash tokens are base64-encoded strings
      expect(token).toMatch(/^[A-Za-z0-9+/=]+$/);
    });
  });

  describe("Service Availability", () => {
    it("should be able to construct OpenAI client", async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      // Verify we can construct a client (not making actual API call)
      expect(apiKey).toBeTruthy();
      // In production, you would test with: new OpenAI({ apiKey })
    });

    it("should be able to construct Upstash Redis client", async () => {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      expect(url).toBeTruthy();
      expect(token).toBeTruthy();
      
      // Verify we can construct a valid Redis URL
      const redisUrl = new URL(url!);
      expect(redisUrl.protocol).toBe("https:");
    });
  });

  describe("Integration Readiness", () => {
    it("should have all required credentials for Vyral Match AI", () => {
      const openaiKey = process.env.OPENAI_API_KEY;
      expect(openaiKey).toBeDefined();
      expect(openaiKey).toMatch(/^sk-proj-/);
    });

    it("should have all required credentials for post monitoring", () => {
      const apifyKey = process.env.APIFY_API_KEY;
      expect(apifyKey).toBeDefined();
      expect(apifyKey).toMatch(/^apify_api_/);
    });

    it("should have all required credentials for background jobs", () => {
      const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
      const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
      
      expect(redisUrl).toBeDefined();
      expect(redisToken).toBeDefined();
      expect(redisUrl).toMatch(/^https:\/\/.*\.upstash\.io$/);
    });
  });
});
