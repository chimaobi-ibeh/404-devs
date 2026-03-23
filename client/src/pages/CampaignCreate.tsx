import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CampaignCreate() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState<any>({
    castingMode: "hybrid",
    category: "brand",
    contentType: "video",
  });

  const createCampaign = trpc.advertiser.createCampaign.useMutation({
    onSuccess: (data: any) => {
      const campaignId = Array.isArray(data) ? data[0]?.id : (data as any)?.id;
      if (campaignId) setLocation(`/brand/campaigns/${campaignId}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    createCampaign.mutate({
      ...formData,
      budget: parseFloat(formData.budget),
      deadline: new Date(formData.deadline),
      postingWindowStart: formData.postingWindowStart || undefined,
      postingWindowEnd: formData.postingWindowEnd || undefined,
      targetPlatforms: formData.targetPlatforms?.length > 0 ? formData.targetPlatforms : undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8">Create New Campaign</h1>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Campaign Details</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Campaign Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Summer Collection Launch"
                    value={formData.title || ""}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your campaign and what you're looking for"
                    value={formData.description || ""}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="music">Music</SelectItem>
                        <SelectItem value="app">App</SelectItem>
                        <SelectItem value="brand">Brand</SelectItem>
                        <SelectItem value="event">Event</SelectItem>
                        <SelectItem value="challenge">Challenge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contentType">Content Type</Label>
                    <Select value={formData.contentType} onValueChange={(v) => setFormData({ ...formData, contentType: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="story">Story</SelectItem>
                        <SelectItem value="reel">Reel</SelectItem>
                        <SelectItem value="hashtag">Hashtag</SelectItem>
                        <SelectItem value="dance_challenge">Dance Challenge</SelectItem>
                        <SelectItem value="trend">Trend</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* Budget & Timeline */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Budget & Timeline</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Total Budget ($)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="0"
                      value={formData.budget || ""}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={formData.deadline || ""}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Casting Mode */}
            <div>
              <h2 className="text-2xl font-bold mb-4">How to Find Creators</h2>
              <Select value={formData.castingMode} onValueChange={(v) => setFormData({ ...formData, castingMode: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hand_pick">Hand-Pick Creators</SelectItem>
                  <SelectItem value="open_call">Open Call</SelectItem>
                  <SelectItem value="vyral_match">Vyral Match AI</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Mix of above)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campaign Brief */}
            <div>
              <h2 className="text-2xl font-bold mb-4">Campaign Brief</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="deliverables">Deliverables</Label>
                  <Textarea
                    id="deliverables"
                    placeholder="What content should creators produce? (e.g. 1x 60s TikTok video, 2x Instagram Stories)"
                    value={formData.deliverables || ""}
                    onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contentDos">Content Dos</Label>
                    <Textarea
                      id="contentDos"
                      placeholder="What creators should include or do..."
                      value={formData.contentDos || ""}
                      onChange={(e) => setFormData({ ...formData, contentDos: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="contentDonts">Content Don'ts</Label>
                    <Textarea
                      id="contentDonts"
                      placeholder="What creators should avoid..."
                      value={formData.contentDonts || ""}
                      onChange={(e) => setFormData({ ...formData, contentDonts: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="block mb-2">Target Platforms</Label>
                  <div className="flex flex-wrap gap-3">
                    {["instagram", "tiktok", "youtube", "x", "twitch"].map((platform) => {
                      const selected: string[] = formData.targetPlatforms || [];
                      const isChecked = selected.includes(platform);
                      return (
                        <label key={platform} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              const next = isChecked
                                ? selected.filter((p) => p !== platform)
                                : [...selected, platform];
                              setFormData({ ...formData, targetPlatforms: next });
                            }}
                          />
                          <span className="text-sm capitalize">{platform}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="postingWindowStart">Posting Window Start</Label>
                    <Input
                      id="postingWindowStart"
                      type="date"
                      value={formData.postingWindowStart || ""}
                      onChange={(e) => setFormData({ ...formData, postingWindowStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postingWindowEnd">Posting Window End</Label>
                    <Input
                      id="postingWindowEnd"
                      type="date"
                      value={formData.postingWindowEnd || ""}
                      onChange={(e) => setFormData({ ...formData, postingWindowEnd: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-6">
              <Button type="submit" disabled={createCampaign.isPending}>
                Create Campaign
              </Button>
              <Button variant="outline" onClick={() => setLocation("/brand/dashboard")}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
