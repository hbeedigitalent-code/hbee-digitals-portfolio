import { supabase } from '@/lib/supabase'
import { fetchSiteSettings } from '@/lib/site-settings'
import { unstable_cache } from 'next/cache'
import { FOOTER_DESCRIPTION, plainSetting, publicSocialProfiles, readNewsletterSettings } from '@/lib/footer-settings'

if (typeof window !== 'undefined') throw Error('Footer data loader is server-only')

/** Public CMS reads use the existing anonymous client and existing RLS. Never expose raw settings. */
export const getFooterExperience = unstable_cache(async () => {
  const [site, footer] = await Promise.allSettled([
    fetchSiteSettings(), supabase.from('footer_settings').select('social_links').limit(2).maybeSingle(),
  ])
  const siteRow = site.status === 'fulfilled' && !site.value.error ? site.value.data : null
  const footerRow = footer.status === 'fulfilled' && !footer.value.error ? footer.value.data : null
  return {
    // The public address is one canonical value (CONTACT_EMAIL in navigation.ts: contact@). The CMS contact_email
    // setting no longer overrides it, so the footer, Contact page and Organization schema cannot disagree.
    description: plainSetting(siteRow?.footer_description, 400) || FOOTER_DESCRIPTION,
    newsletter: readNewsletterSettings(siteRow?.newsletter_settings),
    social: publicSocialProfiles(footerRow?.social_links),
  }
}, ['site-footer-experience-v1'], { revalidate: 60 })
