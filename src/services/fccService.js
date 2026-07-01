export async function lookupProviders(address) {
  await new Promise((resolve) => setTimeout(resolve, 800));

  return [
    {
      id: "lumos",
      name: "Lumos Fiber",
      technology: "Fiber",
      download: 5000,
      upload: 5000,
    },
    {
      id: "att",
      name: "AT&T Fiber",
      technology: "Fiber",
      download: 5000,
      upload: 5000,
    },
    {
      id: "spectrum",
      name: "Spectrum",
      technology: "Cable",
      download: 1000,
      upload: 40,
    },
  ];
}