import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Database,
  Gauge,
  MonitorSmartphone,
  Server,
  ToggleRight,
} from "lucide-react";
import { useAuth } from "../lib/auth";
<<<<<<< HEAD
import { PhenotypingArt, PolyhouseArt, SpeedBreedingArt } from "../components/art/FacilityArt";
import { CountUp, Reveal, TiltCard } from "../components/ui";
import { BrandLockup } from "../components/Brand";

const MOSAIC = [
  { Art: PolyhouseArt, label: "Polyhouse", sub: "Tomato hybrids", tone: "var(--accent)" },
  { Art: PhenotypingArt, label: "Phenotyping", sub: "RGB · thermal · NDVI", tone: "var(--cyan)" },
  {
    Art: SpeedBreedingArt,
    label: "Speed breeding",
    sub: "Wheat · 22 h light · fixed targets",
=======
import { BreedingArt, GrowChamberArt, PolyhouseArt } from "../components/art/FacilityArt";
import { CountUp, Reveal, TiltCard } from "../components/ui";

const MOSAIC = [
  { Art: PolyhouseArt, label: "Polyhouse", sub: "Tomato hybrids", tone: "var(--accent)" },
  { Art: GrowChamberArt, label: "Grow chamber", sub: "Rice drought screen", tone: "var(--cyan)" },
  {
    Art: BreedingArt,
    label: "Speed breeding & Phenotyping",
    sub: "Wheat · 22h light · 7 traits per line",
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    tone: "var(--violet)",
    wide: true,
  },
];

const ENVIRONMENTS = [
  {
    Art: PolyhouseArt,
    eyebrow: "Polyhouses",
    title: "Protected cultivation, read by the hour",
    body: "The sun swings temperature and humidity through the day. Fans, fan-pad cooling, misting and drip irrigation respond to the targets you set, and every swing is on the chart.",
    points: ["Daily temperature and humidity swings", "Soil moisture and drip irrigation", "Fan, cooler and mister control"],
  },
  {
<<<<<<< HEAD
    Art: SpeedBreedingArt,
    eyebrow: "Speed breeding",
    title: "Fixed targets and a 22-hour day, six generations a year",
    body: "Ten sensors watch the room: air temperature and humidity, PPFD, CO₂, soil moisture, root-zone temperature, tank level, irrigation flow and leaf wetness, with the photoperiod kept by the server clock. Fans, heating, vents, humidifier, dehumidifier, irrigation, CO₂, LED lights and the shade screen hold every target, and a camera shows the room live.",
    points: [
      "Fixed targets with dead bands and interlocks",
      "Photoperiod schedule for the grow lights",
      "Live room camera on the facility page",
    ],
  },
  {
    Art: PhenotypingArt,
    eyebrow: "Phenotyping",
    title: "Measure every line, keep the best",
    body: "RGB, thermal and multispectral cameras, a PAR sensor, a stem sensor and a scale record height, leaf count and area, leaf colour, canopy temperature, NDVI, stem thickness, flowering time and yield, so only the strongest lines go on.",
    points: ["Canopy cover and leaf colour from a photo", "Heat stress from canopy minus air temperature", "Growth rate and flowering time worked out for you"],
=======
    Art: GrowChamberArt,
    eyebrow: "Grow chambers",
    title: "Every variable held still but one",
    body: "LED photoperiod, temperature, humidity and CO2 stay locked so a single treatment, such as withholding water, is the only thing that changes between lines.",
    points: ["Square-wave LED photoperiod", "CO2 and climate setpoints", "Controlled stress treatments"],
  },
  {
    Art: BreedingArt,
    eyebrow: "Speed breeding & Phenotyping",
    title: "Six generations a year, and the data to pick the best lines",
    body: "Twenty-two hours of light at 22/17 °C pushes wheat from seed to seed in about nine weeks. Every generation is phenotyped (height, leaf area, NDVI, chlorophyll, biomass) so only the strongest lines go on to the next cycle.",
    points: [
      "22/2 photoperiod dial and generation progress",
      "Growth curves per genotype",
      "Trait rankings across every trial",
    ],
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  },
];

const PIPELINE = [
<<<<<<< HEAD
  { icon: Cpu, title: "Sense", body: "The sensor board reads air, light, CO₂, root zone, water and leaf sensors.", code: "POST /api/device/readings" },
  { icon: Database, title: "Store", body: "The API validates the reading and saves it to MongoDB.", code: "sensor_info" },
  { icon: Server, title: "Decide", body: "The server compares it with the fixed targets and the light schedule.", code: "fans · heater · vents · lights · …" },
=======
  { icon: Cpu, title: "Sense", body: "The sensor board reads the DHT22 and the soil probe.", code: "POST /api/device/readings" },
  { icon: Database, title: "Store", body: "The API validates the reading and saves it to MongoDB.", code: "sensor_info" },
  { icon: Server, title: "Decide", body: "The server compares it with the targets set on the dashboard.", code: "fan · cooler · mister · irrigation" },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  { icon: ToggleRight, title: "Act", body: "The motor board fetches that decision and switches its relays.", code: "GET /api/device/state/:id" },
  { icon: MonitorSmartphone, title: "Watch", body: "The dashboard shows the very same decision, live.", code: "/facility/:id" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="wrap">
      <section className="hero">
        <div>
<<<<<<< HEAD
          <motion.div variants={fadeUp} initial="hidden" animate="show">
            <BrandLockup markSize={76} tagline={false} />
          </motion.div>

          <motion.span
            className="eyebrow"
            style={{ marginTop: 22 }}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
          >
            <span className="dot dot-live" /> AI-Powered Smart Agriculture
          </motion.span>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={2}>
            Every leaf has a story. <span className="hero-gradient">Our AI reads it.</span>
          </motion.h1>

          <motion.blockquote
            className="hero-quote"
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={3}
          >
            “The farm of the future is not bigger. It is better informed.”
          </motion.blockquote>

          <motion.p className="hero-lead" variants={fadeUp} initial="hidden" animate="show" custom={4}>
            Polyhouses and speed breeding rooms report their climate every 30
            seconds, and phenotyping stations measure the plants. Targets drive the relays, computer vision measures the plants, and every
            genotype is tracked from sowing to harvest.
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} initial="hidden" animate="show" custom={5}>
=======
          <motion.span className="eyebrow" variants={fadeUp} initial="hidden" animate="show">
            <span className="dot dot-live" /> Controlled-environment plant research
          </motion.span>

          <motion.h1 variants={fadeUp} initial="hidden" animate="show" custom={1}>
            Grow, breed and <span className="hero-gradient">phenotype</span> from one control room.
          </motion.h1>

          <motion.p className="hero-lead" variants={fadeUp} initial="hidden" animate="show" custom={2}>
            Polyhouses, grow chambers and speed breeding rooms report their climate every 20
            seconds. Set targets, let the relays respond, and follow every genotype from sowing to
            harvest.
          </motion.p>

          <motion.div className="hero-actions" variants={fadeUp} initial="hidden" animate="show" custom={3}>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                Open the control room <ArrowRight size={17} />
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Sign in <ArrowRight size={17} />
              </Link>
            )}
          </motion.div>

<<<<<<< HEAD
          <motion.div className="hero-stats" variants={fadeUp} initial="hidden" animate="show" custom={6}>
=======
          <motion.div className="hero-stats" variants={fadeUp} initial="hidden" animate="show" custom={4}>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            <div className="hero-stat">
              <strong><CountUp to={3} /></strong>
              <span>facility types</span>
            </div>
            <div className="hero-stat">
<<<<<<< HEAD
              <strong><CountUp to={13} /></strong>
              <span>sensor channels</span>
            </div>
            <div className="hero-stat">
              <strong><CountUp to={14} /></strong>
=======
              <strong><CountUp to={8} /></strong>
              <span>sensor channels</span>
            </div>
            <div className="hero-stat">
              <strong><CountUp to={7} /></strong>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
              <span>phenotypic traits</span>
            </div>
          </motion.div>
        </div>

        <div className="mosaic">
          {MOSAIC.map(({ Art, label, sub, tone, wide }, i) => (
            <motion.div
              key={label}
              className={wide ? "mosaic-wide" : undefined}
              initial={{ opacity: 0, y: 30, rotate: i % 2 ? 2 : -2 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ duration: 0.8, delay: 0.25 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
            >
              <TiltCard className="mosaic-card">
                <div className="mosaic-art">
                  <Art />
                </div>
                <div className="mosaic-label">
                  <span className="dot" style={{ color: tone }} />
                  <strong>{label}</strong>
                  <span className="faint">{sub}</span>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal className="section-head">
          <span className="eyebrow">Three environments</span>
          <h2 className="section-title">Built for how plant science is actually done</h2>
        </Reveal>

        <div className="stack" style={{ gap: 28 }}>
          {ENVIRONMENTS.map((env, i) => (
            <Reveal key={env.eyebrow} className={`env${i % 2 ? " env-flip" : ""}`}>
              <div className="env-art panel">
                <env.Art />
              </div>
              <div className="env-copy">
                <span className="eyebrow">{env.eyebrow}</span>
                <h3>{env.title}</h3>
                <p>{env.body}</p>
                <ul className="env-points">
                  {env.points.map((p, k) => (
                    <motion.li
                      key={p}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.15 + k * 0.08 }}
                    >
                      <Gauge size={15} /> {p}
                    </motion.li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal className="section-head">
          <span className="eyebrow">Sensor to relay</span>
          <h2 className="section-title">How a sensor node talks to the platform</h2>
          <p style={{ maxWidth: "60ch" }}>
            The server makes every relay decision once. The board and the dashboard both read that
            same decision, so what you see is what the hardware is doing.
          </p>
        </Reveal>

        <div className="pipeline">
          {PIPELINE.map((step, i) => (
            <Reveal key={step.title} delay={i * 0.1} className="pipeline-step">
              <span className="pipeline-icon">
                <step.icon size={19} />
              </span>
              <strong>
                <span className="faint mono">0{i + 1}</span> {step.title}
              </strong>
              <p>{step.body}</p>
              <code className="pipeline-code">{step.code}</code>
              {i < PIPELINE.length - 1 && <span className="pipeline-link" aria-hidden="true" />}
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section">
        <Reveal className="panel stats-band">
          <div>
            <strong><CountUp to={6} /></strong>
            <span>generations a year under speed breeding</span>
          </div>
          <div>
            <strong><CountUp to={22} suffix="h" /></strong>
            <span>daily photoperiod for wheat</span>
          </div>
          <div>
<<<<<<< HEAD
            <strong><CountUp to={30} suffix="s" /></strong>
            <span>between sensor reports</span>
          </div>
          <div>
            <strong><CountUp to={9} /></strong>
            <span>actuators held to fixed targets</span>
=======
            <strong><CountUp to={20} suffix="s" /></strong>
            <span>between sensor reports</span>
          </div>
          <div>
            <strong><CountUp to={4} /></strong>
            <span>relays driven per facility</span>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
          </div>
        </Reveal>
      </section>
    </div>
  );
}
