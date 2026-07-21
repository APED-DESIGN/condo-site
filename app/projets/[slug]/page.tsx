import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getNextProject, getProject, projects } from "@/lib/projects";
import ProjectClient from "./ProjectClient";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const project = getProject(params.slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.excerpt,
    openGraph: {
      title: `${project.title} — STUDIO NORDEN`,
      description: project.excerpt,
      images: [{ url: project.cover, width: 1200, height: 800, alt: project.coverAlt }],
    },
  };
}

export default function ProjectPage({ params }: { params: { slug: string } }) {
  const project = getProject(params.slug);
  if (!project) notFound();
  const next = getNextProject(params.slug);

  return (
    <main id="contenu">
      <ProjectClient project={project} next={next} />
    </main>
  );
}
