import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

const baseUrl = "https://hbeedigitals.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/about",
    "/services",
    "/portfolio",
    "/projects",
    "/process",
    "/blog",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
  ];

  const { data: portfolioItems } = await supabase
    .from("portfolio_items")
    .select("slug")
    .eq("is_active", true);

  const { data: services } = await supabase
    .from("services")
    .select("slug")
    .eq("is_active", true);

  const portfolioRoutes =
    portfolioItems
      ?.filter((item) => item.slug)
      .map((item) => ({
        url: `${baseUrl}/portfolio/${item.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.85,
      })) || [];

  const serviceRoutes =
    services
      ?.filter((service) => service.slug)
      .map((service) => ({
        url: `${baseUrl}/services/${service.slug}`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.82,
      })) || [];

  return [
    ...staticRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: route === "" ? ("weekly" as const) : ("monthly" as const),
      priority: route === "" ? 1 : 0.8,
    })),
    ...portfolioRoutes,
    ...serviceRoutes,
  ];
}