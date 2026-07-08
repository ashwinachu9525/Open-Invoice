import { notFound } from "next/navigation"
import { getCompanyProfileBySlug } from "@/actions/profile"
import { ContactForm } from "@/components/public-profile/contact-form"
import { Card, CardContent } from "@/components/ui/card"
import { Globe, MapPin, Phone, Mail, Star, Briefcase, ExternalLink } from "lucide-react"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await getCompanyProfileBySlug(slug)
  if (!company) {
    return { title: "Profile Not Found" }
  }
  return {
    title: `${company.name} | Showcase`,
    description: company.tagline || company.description || `View ${company.name}'s profile`,
  }
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const company = await getCompanyProfileBySlug(slug)

  if (!company) {
    return notFound()
  }

  const isPro = company.subscriptionTier === "PRO" || company.subscriptionTier === "ENTERPRISE"

  return (
    <main className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30">
      {/* ── Hero Banner ── */}
      <div className="relative h-64 md:h-80 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-[#050505] to-[#050505] opacity-50"></div>
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#050505] to-transparent"></div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-20">
        
        {/* ── Profile Header Card ── */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 fade-in flex flex-col md:flex-row gap-8 items-start md:items-center">
          
          <div className="flex-shrink-0">
            {company.logo ? (
              <img src={company.logo} alt={company.name} className="w-28 h-28 md:w-36 md:h-36 rounded-2xl object-cover border border-white/10 shadow-xl bg-[#111]" />
            ) : (
              <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-4xl font-bold text-white shadow-xl border border-white/10">
                {company.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                {company.name}
              </h1>
              {company.tagline && (
                <p className="text-lg md:text-xl text-indigo-400 font-medium mt-1">{company.tagline}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              {company.address && (
                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                  <MapPin className="h-4 w-4" />
                  {company.address}{company.state ? `, ${company.state}` : ''}
                </div>
              )}
              {company.website && (
                <a href={company.website.startsWith('http') ? company.website : `https://${company.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {company.twitterUrl && (
                <a href={company.twitterUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 rounded-full transition-all border border-white/10 font-medium text-xs flex items-center justify-center">
                  X/Twitter
                </a>
              )}
              {company.linkedinUrl && (
                <a href={company.linkedinUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-blue-500/20 hover:text-blue-400 rounded-full transition-all border border-white/10 font-medium text-xs flex items-center justify-center">
                  LinkedIn
                </a>
              )}
              {company.instagramUrl && (
                <a href={company.instagramUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-pink-500/20 hover:text-pink-400 rounded-full transition-all border border-white/10 font-medium text-xs flex items-center justify-center">
                  Instagram
                </a>
              )}
              {company.githubUrl && (
                <a href={company.githubUrl} target="_blank" rel="noreferrer" className="p-2.5 bg-white/5 hover:bg-slate-700/50 hover:text-white rounded-full transition-all border border-white/10 font-medium text-xs flex items-center justify-center">
                  GitHub
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
          
          {/* ── Main Content Column ── */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* About Section */}
            {company.description && (
              <section className="animate-in slide-in-from-bottom-8 duration-700 delay-100 fade-in fill-mode-both">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Briefcase className="w-4 h-4" />
                  </span>
                  About Us
                </h2>
                <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {company.description}
                </div>
              </section>
            )}

            {/* Products & Services */}
            {company.catalog && company.catalog.length > 0 && (
              <section className="animate-in slide-in-from-bottom-8 duration-700 delay-200 fade-in fill-mode-both">
                <h2 className="text-2xl font-bold flex items-center gap-2 mb-6">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Star className="w-4 h-4" />
                  </span>
                  Services & Products
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {company.catalog.map((item) => (
                    <Card key={item.id} className="bg-white/5 border-white/10 hover:border-indigo-500/50 hover:bg-white/10 transition-all duration-300">
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg text-white">{item.name}</h3>
                          <span className="font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded text-sm font-medium">
                            ₹{item.unitPrice.toLocaleString()}
                            {item.unit ? `/${item.unit}` : ''}
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-slate-400 flex-1">{item.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Testimonials */}
            {company.testimonials && company.testimonials.length > 0 && (
              <section className="animate-in slide-in-from-bottom-8 duration-700 delay-300 fade-in fill-mode-both">
                <h2 className="text-2xl font-bold mb-6">Client Testimonials</h2>
                <div className="grid grid-cols-1 gap-6">
                  {company.testimonials.map((t) => (
                    <div key={t.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative">
                      <div className="absolute top-6 right-6 text-yellow-500 flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < t.rating ? "fill-current" : "opacity-30"}`} />
                        ))}
                      </div>
                      <p className="text-slate-300 italic mb-6 relative z-10 text-lg">"{t.content}"</p>
                      <div className="flex items-center gap-4">
                        {t.avatarUrl ? (
                          <img src={t.avatarUrl} alt={t.clientName} className="w-12 h-12 rounded-full object-cover border border-white/20" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold">
                            {t.clientName.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{t.clientName}</p>
                          {t.clientRole && <p className="text-sm text-slate-400">{t.clientRole}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </div>

          {/* ── Sidebar Column ── */}
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700 delay-400 fade-in fill-mode-both">
            
            {/* Contact Info Card */}
            <Card className="bg-white/5 border-white/10 sticky top-8">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-6 text-white">Contact Info</h3>
                <div className="space-y-4">
                  {company.phone && (
                    <a href={`tel:${company.phone}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                        <Phone className="w-4 h-4" />
                      </div>
                      <span>{company.phone}</span>
                    </a>
                  )}
                  {company.email && (
                    <a href={`mailto:${company.email}`} className="flex items-center gap-3 text-slate-300 hover:text-white transition-colors group">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <span className="break-all">{company.email}</span>
                    </a>
                  )}
                </div>
                
                <div className="mt-8 pt-8 border-t border-white/10">
                  <h4 className="font-medium text-sm text-slate-400 mb-4">Send a Message</h4>
                  <ContactForm slug={slug} />
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
      
      {/* Footer Branding */}
      {!company.removeWatermark && !isPro && (
        <div className="text-center py-10 border-t border-white/5 mt-10">
          <p className="text-slate-500 flex items-center justify-center gap-2 text-sm">
            Powered by 
            <a href="/" className="font-semibold text-white hover:text-indigo-400 transition-colors">Open-Invoice</a>
          </p>
        </div>
      )}
    </main>
  )
}
