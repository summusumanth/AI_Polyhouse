import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
<<<<<<< HEAD
import { ArrowLeft, Download, MapPin, Ruler, Sprout } from "lucide-react";
import { api } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { timeAgo } from "../lib/format";
import { CAMERA_ROLES, isControlled, typeMeta } from "../lib/facility";
=======
import { ArrowLeft, Download, MapPin, Ruler } from "lucide-react";
import { api } from "../lib/api";
import { usePolling } from "../lib/usePolling";
import { timeAgo } from "../lib/format";
import { measuresLightAndNutrients, typeMeta } from "../lib/facility";
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
import { ACCESS_LABELS, can } from "../lib/roles";
import { useToast } from "../components/Toast";
import { PageLoader, Spinner } from "../components/Spinner";
import { CopyButton } from "../components/ui";
import FacilityArt from "../components/art/FacilityArt";
<<<<<<< HEAD
import CameraView, { useCameras } from "../components/CameraView";
import { GenerationTracker, PhotoperiodRing } from "../components/SpeedBreedingPanel";
import EnvironmentTab from "../components/facility/EnvironmentTab";
import ControlTab, { AlertList } from "../components/facility/ControlTab";
import ReadingsTab from "../components/facility/ReadingsTab";
import CamerasTab from "../components/facility/CamerasTab";
import PhenotypingTab from "../components/facility/PhenotypingTab";
import StationTab from "../components/facility/StationTab";
import DeviceTab from "../components/facility/DeviceTab";

const POLL_MS = 20000;

// Tabs per kind of facility. A speed breeding room or polyhouse is run to
// fixed targets; a phenotyping station measures plants and controls nothing.
function tabsFor(facility, hasCameras) {
  const operate = can(facility, "operate");
  if (facility.type === "phenotyping") {
    return [
      { id: "traits", label: "Traits" },
      hasCameras && { id: "cameras", label: "Cameras" },
      { id: "environment", label: "Station sensors" },
      { id: "devices", label: "Devices" },
      { id: "readings", label: "Readings" },
      // Device setup reveals the server address and facility id, so it is
      // for people who run the hardware: operate access and above.
      operate && { id: "device", label: "Device setup" },
    ].filter(Boolean);
  }
  return [
    { id: "environment", label: "Sensors" },
    { id: "control", label: "Targets & control" },
    hasCameras && { id: "cameras", label: "Camera" },
    { id: "readings", label: "Readings" },
    operate && { id: "device", label: "Device setup" },
  ].filter(Boolean);
}
=======
import { GenerationTracker, PhotoperiodRing } from "../components/SpeedBreedingPanel";
import ClimateTab from "../components/facility/ClimateTab";
import NutrientsTab from "../components/facility/NutrientsTab";
import PhenotypingTab from "../components/facility/PhenotypingTab";
import DeviceTab from "../components/facility/DeviceTab";

const TABS = [
  { id: "climate", label: "Climate" },
  { id: "nutrients", label: "Nutrients & light" },
  { id: "phenotyping", label: "Phenotyping" },
  { id: "device", label: "Device setup" },
];

const POLL_MS = 20000;
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

export default function FacilityDetail() {
  const { id } = useParams();
  const toast = useToast();

  const [facility, setFacility] = useState(null);
  const [readings, setReadings] = useState([]);
  const [series, setSeries] = useState([]);
  const [hours, setHours] = useState(24);
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
<<<<<<< HEAD
  const [tab, setTab] = useState(null);
=======
  const [tab, setTab] = useState("climate");
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  const [downloading, setDownloading] = useState(false);

  const loadLive = useCallback(async () => {
    const [readingsRes, stateRes] = await Promise.all([api.listReadings(id, 50), api.getState(id)]);
    setReadings(readingsRes.data);
    setState(stateRes.data);
  }, [id]);

  const loadSeries = useCallback(async () => {
    const res = await api.readingSeries(id, hours);
    setSeries(res.data);
  }, [id, hours]);

  // Facility details and the live data, then poll the live data.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
<<<<<<< HEAD
    setTab(null);
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

    (async () => {
      try {
        const res = await api.getFacility(id);
        if (cancelled) return;
        setFacility(res.data);
        await loadLive();
      } catch (err) {
        if (!cancelled) {
          setFacility(null);
          if (err.status !== 404) toast.error(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, loadLive, toast]);

  // Live values refresh while the tab is visible (the first load is above).
  usePolling(() => loadLive().catch(() => {}), POLL_MS, [loadLive], { immediate: false });

  // The chart window has its own loader so switching 24h/7d is instant.
  usePolling(() => loadSeries().catch((err) => toast.error(err.message)), POLL_MS, [loadSeries]);

<<<<<<< HEAD
  const cameraRoles = (CAMERA_ROLES[facility?.type] || []).filter((r) => facility?.cameras?.[r]);
  const { cameras, error: cameraError, reload: reloadCameras } = useCameras(id, cameraRoles.length > 0);

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  const download = async () => {
    setDownloading(true);
    try {
      const blob = await api.exportCsv(id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${facility.name.replace(/[^\w-]+/g, "-")}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <PageLoader label="Loading facility" />;

  if (!facility) {
    return (
      <div className="wrap" style={{ paddingTop: 48 }}>
        <div className="panel empty">
          <h3>Facility not found</h3>
          <p>It may have been deleted, or the link is wrong.</p>
          <Link to="/dashboard" className="btn btn-ghost btn-sm">
            <ArrowLeft size={15} /> Back to the control room
          </Link>
        </div>
      </div>
    );
  }

  const meta = typeMeta(facility.type);
  const latest = readings[0] || null;
  const online = latest && Date.now() - new Date(latest.date).getTime() < 3600 * 1000;
<<<<<<< HEAD
  const isSpeed = facility.type === "speed_breeding";
  const tabs = tabsFor(facility, cameraRoles.length > 0);
  const activeTab = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const heroCamera = cameras?.[0];
  const back = isSpeed ? ["/speed-breeding", "Speed breeding"] : facility.type === "phenotyping" ? ["/phenotyping", "Phenotyping"] : ["/dashboard", "Control room"];

  return (
    <div className="wrap" style={{ paddingTop: 30 }}>
      <Link to={back[0]} className="btn btn-quiet btn-sm" style={{ marginLeft: -14 }}>
        <ArrowLeft size={15} /> {back[1]}
=======
  const lightHours = facility.photoperiod?.lightHours;
  const showPhotoperiod = facility.type !== "polyhouse" && lightHours;

  return (
    <div className="wrap" style={{ paddingTop: 30 }}>
      <Link to="/dashboard" className="btn btn-quiet btn-sm" style={{ marginLeft: -14 }}>
        <ArrowLeft size={15} /> Control room
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
      </Link>

      <section className="detail-hero" style={{ "--tone": meta.tone }}>
        <motion.div
          className="detail-hero-copy"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="type-badge">
            <meta.icon size={14} /> {meta.label}
          </span>
          <h1 className="section-title">{facility.name}</h1>
          {(facility.crop || facility.variety) && (
            <div className="detail-crop">{[facility.crop, facility.variety].filter(Boolean).join(" · ")}</div>
          )}
          <p className="detail-desc">{facility.desc}</p>

          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            <span className={`pill ${online ? "pill-on" : ""}`}>
              <span className={`dot${online ? " dot-live" : ""}`} />
              {latest ? `updated ${timeAgo(latest.date)}` : "waiting for first reading"}
            </span>
            {(facility.areaName || facility.location) && (
              <span className="pill">
                <MapPin size={12} /> {[facility.areaName, facility.location].filter(Boolean).join(" · ")}
              </span>
            )}
            <span className={`pill${facility.permission === "view" ? "" : " pill-on"}`} title="Your access to this facility">
              {facility.permission === "manage" ? "You manage this" : `${ACCESS_LABELS[facility.permission]} access`}
            </span>
            {facility.areaSqm ? (
              <span className="pill">
                <Ruler size={12} /> {facility.areaSqm} m²
              </span>
            ) : null}
<<<<<<< HEAD
            {facility.sowingDate && (
              <span className="pill">
                <Sprout size={12} /> sown {new Date(facility.sowingDate).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
              </span>
            )}
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
          </div>

          <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            <CopyButton text={facility._id} label="Copy facility id" onCopied={() => toast.success("Facility id copied")} />
            <button className="btn btn-ghost btn-sm" onClick={download} disabled={downloading}>
              {downloading ? <Spinner /> : <Download size={14} />} Export CSV
            </button>
          </div>
        </motion.div>

        <motion.div
<<<<<<< HEAD
          className={`detail-hero-art panel${heroCamera ? " detail-hero-camera" : ""}`}
=======
          className="detail-hero-art panel"
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
<<<<<<< HEAD
          {heroCamera ? <CameraView info={heroCamera} compact onRetry={reloadCameras} /> : <FacilityArt type={facility.type} />}
        </motion.div>
      </section>

      {isSpeed && (
=======
          <FacilityArt type={facility.type} />
        </motion.div>
      </section>

      {(showPhotoperiod || facility.type === "speed_breeding") && (
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
        <motion.section
          className="grid sb-grid"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
<<<<<<< HEAD
          <div className="panel">
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Photoperiod</h2>
                <span className="faint">extended day length drives rapid flowering</span>
              </div>
            </div>
            {state?.photoperiod ? (
              <PhotoperiodRing schedule={state.photoperiod} />
            ) : (
              <span className="faint">No photoperiod set. Edit the facility to set hours of light and when they start.</span>
            )}
          </div>
          {facility.program?.totalGenerations ? (
=======
          {showPhotoperiod && (
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Photoperiod</h2>
                  <span className="faint">
                    {facility.type === "speed_breeding" ? "Extended day length drives rapid flowering" : "LED day length"}
                  </span>
                </div>
              </div>
              <PhotoperiodRing lightHours={lightHours} />
            </div>
          )}
          {facility.type === "speed_breeding" && facility.program?.totalGenerations ? (
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            <div className="panel">
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">Generation advance</h2>
<<<<<<< HEAD
                  <span className="faint">seed to seed, repeated in the same room</span>
=======
                  <span className="faint">Seed to seed, repeated in the same room</span>
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
                </div>
              </div>
              <GenerationTracker program={facility.program} />
            </div>
          ) : null}
        </motion.section>
      )}

<<<<<<< HEAD
      {isControlled(facility.type) && state?.alerts?.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <AlertList alerts={state.alerts} />
        </div>
      )}

      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Facility sections">
          {tabs.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={activeTab === item.id}
              className={`tab${activeTab === item.id ? " tab-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {activeTab === item.id && (
                <motion.span className="tab-pill" layoutId="facility-tab" transition={{ type: "spring", stiffness: 340, damping: 30 }} />
=======
      <div className="tabs-row">
        <div className="tabs" role="tablist" aria-label="Facility sections">
          {TABS.filter(
            (t) =>
              (t.id !== "nutrients" || measuresLightAndNutrients(facility.type)) &&
              // Device setup reveals the server address and facility id, so it
              // is for people who run the hardware: operate access and above.
              (t.id !== "device" || can(facility, "operate"))
          ).map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={`tab${tab === item.id ? " tab-active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              {tab === item.id && (
                <motion.span
                  className="tab-pill"
                  layoutId="facility-tab"
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                />
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
              )}
              <span className="tab-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* No exit animation: the new tab appears on the click, not 0.3 s later. */}
<<<<<<< HEAD
      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        {activeTab === "environment" && (
          <EnvironmentTab facility={facility} latest={latest} series={series} hours={hours} setHours={setHours} state={state} />
        )}
        {activeTab === "control" && (
          <ControlTab
            facility={facility}
            facilityId={id}
            latest={latest}
=======
      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {tab === "climate" && (
          <ClimateTab
            facilityType={facility.type}
            facilityId={id}
            latest={latest}
            readings={readings}
            series={series}
            hours={hours}
            setHours={setHours}
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
            state={state}
            canOperate={can(facility, "operate")}
            onSaved={loadLive}
          />
        )}
<<<<<<< HEAD
        {activeTab === "cameras" && (
          <CamerasTab cameras={cameras} error={cameraError} reload={reloadCameras} canManage={can(facility, "manage")} />
        )}
        {activeTab === "readings" && <ReadingsTab readings={readings} />}
        {activeTab === "traits" && (
          <PhenotypingTab
            facility={facility}
            canOperate={can(facility, "operate")}
            hasRgbCamera={Boolean(cameras?.find((c) => c.role === "rgb" && c.canAnalyse))}
          />
        )}
        {activeTab === "devices" && <StationTab facility={facility} cameraRoles={cameraRoles} />}
        {activeTab === "device" && <DeviceTab facility={facility} latest={latest} />}
=======
        {tab === "nutrients" && <NutrientsTab latest={latest} series={series} hours={hours} setHours={setHours} />}
        {tab === "phenotyping" && <PhenotypingTab facility={facility} canOperate={can(facility, "operate")} />}
        {tab === "device" && <DeviceTab facility={facility} latest={latest} />}
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
      </motion.div>
    </div>
  );
}
