import { catalogTechnologyKey } from "./productCatalog.js";

const INSTALLATION_GUIDANCE = Object.freeze({
  fiber: {
    method: "Technician visit likely",
    estimatedWindow: "Appointment availability varies by address",
    notes: "A technician or new fiber drop may be required, especially for first-time fiber service.",
  },
  cable: {
    method: "Self-install or technician visit",
    estimatedWindow: "Appointment availability varies by address",
    notes: "Self-install may be available when compatible wiring is already active; otherwise a technician visit may be required.",
  },
  fixedWireless: {
    method: "Self-install may be available",
    estimatedWindow: "Equipment and signal verification required",
    notes: "Final setup depends on equipment availability, signal quality, and provider eligibility at the address.",
  },
  dsl: {
    method: "Self-install or technician visit",
    estimatedWindow: "Appointment availability varies by address",
    notes: "Existing telephone wiring may support installation, but line qualification is required.",
  },
  satellite: {
    method: "Professional installation likely",
    estimatedWindow: "Scheduling varies by installer availability",
    notes: "A clear installation location and provider-approved equipment setup are typically required.",
  },
  broadband: {
    method: "Provider confirmation required",
    estimatedWindow: "Appointment availability varies by address",
    notes: "Installation method and timing depend on the selected provider, technology, and service address.",
  },
});

export function installationGuidance(provider = {}) {
  const key = catalogTechnologyKey(provider);
  const explicit = provider.installation || provider.revenueProduct?.installation;
  const baseline = INSTALLATION_GUIDANCE[key] || INSTALLATION_GUIDANCE.broadband;

  return {
    ...baseline,
    ...(explicit && typeof explicit === "object" ? explicit : {}),
    estimated: true,
    disclaimer: "Installation method, charges, and appointment timing are confirmed by the provider before submission.",
  };
}

export { INSTALLATION_GUIDANCE };
