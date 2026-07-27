/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Les images de visite sont immuables : leur nom encode leur position
        // dans la séquence, et une nouvelle extraction réécrit tout le dossier.
        // Sans ça, chaque retour en arrière hors fenêtre re-télécharge l'image.
        source: "/frames/:path*.webp",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
