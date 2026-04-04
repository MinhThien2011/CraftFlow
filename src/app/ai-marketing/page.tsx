"use client"

import { useState } from "react"
import {
  Megaphone,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  Image,
  MessageSquare,
  Hash,
} from "lucide-react"

import { AppShell } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { products } from "@/lib/mock-data"

const platforms = [
  { id: "facebook", name: "Facebook", icon: "📘" },
  { id: "instagram", name: "Instagram", icon: "📸" },
  { id: "tiktok", name: "TikTok", icon: "🎵" },
  { id: "shopee", name: "Shopee", icon: "🛒" },
]

const sampleCaptions = {
  "Gấu bông Teddy": {
    caption:
      "🧸 Gấu bông Teddy móc len thủ công - Người bạn đồng hành hoàn hảo!\n\n✨ Được móc tỉ mỉ từ len cotton cao cấp\n🎁 Quà tặng ý nghĩa cho người thương\n📏 Kích thước: 25cm\n💯 100% handmade với tình yêu\n\n#guabonglen #handmade #quaTang #moclenmini",
    hashtags: ["guabonglen", "handmade", "quaTang", "moclenmini", "teddybear", "yarncraft"],
  },
  "Túi đeo chéo handmade": {
    caption:
      "👜 Túi đeo chéo móc len - Phong cách độc đáo!\n\n🌿 Chất liệu len acrylic mềm mại\n🔒 Có khóa kéo tiện lợi\n💼 Đựng vừa điện thoại, ví, son...\n🎨 Nhiều màu sắc trendy\n\n#tuilenmoclen #handmadebag #fashionbag #crocheting",
    hashtags: ["tuilenmoclen", "handmadebag", "fashionbag", "crocheting", "bohodecor"],
  },
}

export default function AIMarketingPage() {
  const [selectedProduct, setSelectedProduct] = useState<string>("")
  const [selectedPlatform, setSelectedPlatform] = useState<string>("facebook")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCaption, setGeneratedCaption] = useState("")
  const [copied, setCopied] = useState(false)

  const handleGenerate = () => {
    if (!selectedProduct) return
    setIsGenerating(true)

    setTimeout(() => {
      const product = products.find((p) => p.id === selectedProduct)
      if (product && sampleCaptions[product.name as keyof typeof sampleCaptions]) {
        setGeneratedCaption(
          sampleCaptions[product.name as keyof typeof sampleCaptions].caption
        )
      } else {
        setGeneratedCaption(
          `✨ ${product?.name} - Sản phẩm thủ công độc đáo!\n\n🧶 Được làm từ len chất lượng cao\n💝 Quà tặng ý nghĩa cho người thương\n🎨 Thiết kế độc quyền\n\n#handmade #moclenmini #yarncraft #vietnam`
        )
      }
      setIsGenerating(false)
    }, 1500)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCaption)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <AppShell title="AI Marketing" subtitle="Welcome to CRAFTFLOW">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              AI Marketing Assistant
            </h2>
            <p className="text-sm text-muted-foreground">
              Generate engaging content for your social media marketing
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F5E9]">
                <MessageSquare className="h-6 w-6 text-[#4A7C23]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Captions Generated</p>
                <p className="text-2xl font-bold">156</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#FFF3E0]">
                <Hash className="h-6 w-6 text-[#D4A574]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hashtags Used</p>
                <p className="text-2xl font-bold">420</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E3F2FD]">
                <Image className="h-6 w-6 text-[#17A2B8]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Posts Created</p>
                <p className="text-2xl font-bold">89</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#F3E8FF]">
                <Sparkles className="h-6 w-6 text-[#9333EA]" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">AI Credits</p>
                <p className="text-2xl font-bold">∞</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Generator */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Megaphone className="h-5 w-5 text-[#8B7355]" />
                Generate Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Product</label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <div className="flex flex-wrap gap-2">
                  {platforms.map((platform) => (
                    <Button
                      key={platform.id}
                      variant={selectedPlatform === platform.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedPlatform(platform.id)}
                      className="gap-2"
                    >
                      <span>{platform.icon}</span>
                      {platform.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tone of Voice</label>
                <Select defaultValue="friendly">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendly">Friendly & Warm</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="playful">Playful & Fun</SelectItem>
                    <SelectItem value="luxury">Luxury & Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleGenerate}
                disabled={!selectedProduct || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-5 w-5 text-[#9333EA]" />
                  Generated Content
                </CardTitle>
                {generatedCaption && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopy}
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {generatedCaption ? (
                <div className="space-y-4">
                  <Textarea
                    value={generatedCaption}
                    onChange={(e) => setGeneratedCaption(e.target.value)}
                    className="min-h-[200px] resize-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">📘 Facebook</Badge>
                    <Badge variant="secondary">📸 Instagram</Badge>
                    <Badge variant="secondary">🎵 TikTok</Badge>
                  </div>
                </div>
              ) : (
                <div className="flex h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-border">
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="mx-auto h-8 w-8 mb-2" />
                    <p>Select a product and generate content</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium">Product Launch</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Announce new products with excitement
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium">Sale Promotion</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create urgency for special offers
                </p>
              </div>
              <div className="rounded-lg border border-border p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                <p className="font-medium">Behind the Scenes</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Show your crafting process
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
