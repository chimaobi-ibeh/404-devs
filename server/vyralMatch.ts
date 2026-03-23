import { invokeLLM } from "./_core/llm";
import type { Campaign, CreatorProfile } from "../drizzle/schema";
import type { InsertVyralMatchScore } from "../drizzle/schema";

/**
 * VYRAL MATCH SCORING ALGORITHM
 * Combines niche match, engagement rate, and tier with optional OpenAI enhancement
 */

// Creator tier follower ranges
const TIER_RANGES = {
  nano: { min: 1000, max: 10000 },
  micro: { min: 10000, max: 100000 },
  mid: { min: 100000, max: 500000 },
  macro: { min: 500000, max: 2000000 },
  mega: { min: 2000000, max: Infinity },
};

// Tier score multipliers
const TIER_SCORES = {
  nano: 20,
  micro: 40,
  mid: 60,
  macro: 80,
  mega: 100,
};

/**
 * Calculate creator tier based on follower count
 */
export function calculateCreatorTier(followers: number): "nano" | "micro" | "mid" | "macro" | "mega" {
  if (followers < 10000) return "nano";
  if (followers < 100000) return "micro";
  if (followers < 500000) return "mid";
  if (followers < 2000000) return "macro";
  return "mega";
}

/**
 * Calculate niche match score (0-100)
 * Simple keyword matching - can be enhanced with NLP
 */
function calculateNicheScore(campaignNiche: string, creatorNiche: string): number {
  if (!campaignNiche || !creatorNiche) return 50;

  const campaignTerms = campaignNiche.toLowerCase().split(/[\s,]+/);
  const creatorTerms = creatorNiche.toLowerCase().split(/[\s,]+/);

  const matches = campaignTerms.filter((term) => creatorTerms.some((ct) => ct.includes(term) || term.includes(ct)));

  return Math.min(100, (matches.length / campaignTerms.length) * 100);
}

/**
 * Calculate engagement score (0-100)
 * Normalized from engagement rate percentage
 */
function calculateEngagementScore(engagementRate: number): number {
  // Typical engagement rates range from 1-10%
  // Normalize to 0-100 scale
  return Math.min(100, engagementRate * 10);
}

/**
 * Calculate tier score (0-100)
 * Based on creator tier
 */
function calculateTierScore(tier: string): number {
  return TIER_SCORES[tier as keyof typeof TIER_SCORES] || 50;
}

/**
 * Calculate weighted Vyral Match score
 * Weights: Niche 40%, Engagement 35%, Tier 25%
 */
function calculateWeightedScore(nicheScore: number, engagementScore: number, tierScore: number): number {
  return nicheScore * 0.4 + engagementScore * 0.35 + tierScore * 0.25;
}

/**
 * Main scoring function - calculates match score between campaign and creator
 */
export async function calculateVyralMatchScore(
  campaign: Campaign,
  creator: CreatorProfile
): Promise<InsertVyralMatchScore> {
  const nicheScore = calculateNicheScore(campaign.targetAudience || "", creator.niche);
  const engagementScore = calculateEngagementScore(Number(creator.engagementRate));
  const tierScore = calculateTierScore(creator.tier);
  const totalScore = calculateWeightedScore(nicheScore, engagementScore, tierScore);

  let aiEnhancedScore: number | null = null;
  let matchReason: string | null = null;

  // Optional: Use OpenAI for enhanced matching if API key is available
  if (process.env.OPENAI_API_KEY) {
    try {
      const aiAnalysis = await enhanceMatchWithAI(campaign, creator, {
        nicheScore,
        engagementScore,
        tierScore,
        totalScore,
      });

      aiEnhancedScore = aiAnalysis.score;
      matchReason = aiAnalysis.reason;
    } catch (error) {
      console.error("[Vyral Match] AI enhancement failed:", error);
      // Fall back to base scoring
    }
  }

  return {
    campaignId: campaign.id,
    creatorId: creator.id,
    nicheScore: String(nicheScore),
    engagementScore: String(engagementScore),
    tierScore: String(tierScore),
    totalScore: String(aiEnhancedScore || totalScore),
    aiEnhancedScore: aiEnhancedScore ? String(aiEnhancedScore) : undefined,
    matchReason: matchReason || generateMatchReason(nicheScore, engagementScore, tierScore),
  };
}

/**
 * Generate human-readable match reason
 */
function generateMatchReason(nicheScore: number, engagementScore: number, tierScore: number): string {
  const reasons = [];

  if (nicheScore >= 80) reasons.push("Excellent niche alignment");
  else if (nicheScore >= 60) reasons.push("Good niche match");

  if (engagementScore >= 80) reasons.push("Outstanding engagement rate");
  else if (engagementScore >= 60) reasons.push("Strong audience engagement");

  if (tierScore >= 80) reasons.push("Ideal audience size");
  else if (tierScore >= 60) reasons.push("Good audience reach");

  return reasons.length > 0 ? reasons.join(". ") : "Potential match based on profile";
}

/**
 * Enhance match score using OpenAI API
 * Provides contextual analysis beyond algorithmic scoring
 */
async function enhanceMatchWithAI(
  campaign: Campaign,
  creator: CreatorProfile,
  baseScores: {
    nicheScore: number;
    engagementScore: number;
    tierScore: number;
    totalScore: number;
  }
): Promise<{ score: number; reason: string }> {
  try {
    const systemPrompt = "You are a creator-brand matching expert. Analyze the fit between a brand campaign and a content creator. Provide a match score (0-100) and a brief reason. Consider audience alignment, content style compatibility, and campaign fit. Respond with JSON: {\"score\": number, \"reason\": \"string\"}";
    const userPrompt = `Campaign: ${campaign.title}\nCategory: ${campaign.category}\nContent Type: ${campaign.contentType}\nTarget Audience: ${campaign.targetAudience}\n\nCreator: ${creator.displayName}\nNiche: ${creator.niche}\nTier: ${creator.tier}\nEngagement Rate: ${creator.engagementRate}%\n\nBase Scores - Niche: ${baseScores.nicheScore.toFixed(1)}, Engagement: ${baseScores.engagementScore.toFixed(1)}, Tier: ${baseScores.tierScore.toFixed(1)}\n\nProvide an enhanced match score considering all factors.`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "match_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "number", description: "Match score 0-100" },
              reason: { type: "string", description: "Brief explanation of the match" },
            },
            required: ["score", "reason"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) throw new Error("No response from AI");

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);
    return {
      score: Math.min(100, Math.max(0, parsed.score)),
      reason: parsed.reason,
    };
  } catch (error) {
    console.error("[Vyral Match] AI enhancement error:", error);
    throw error;
  }
}

/**
 * Batch calculate scores for multiple creators
 */
export async function calculateBatchScores(
  campaign: Campaign,
  creators: CreatorProfile[]
): Promise<InsertVyralMatchScore[]> {
  const scores = await Promise.all(creators.map((creator) => calculateVyralMatchScore(campaign, creator)));

  // Sort by total score descending
  return scores.sort((a, b) => {
    const scoreA = Number(b.totalScore || 0);
    const scoreB = Number(a.totalScore || 0);
    return scoreA - scoreB;
  });
}
