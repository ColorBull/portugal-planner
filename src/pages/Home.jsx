import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plane } from "lucide-react";
import { tripPlans, tripDays } from "@/data/tripPlans";
import DayPlanModal from "@/components/DayPlanModal";

export default function Home() {
  const [selectedKey, setSelectedKey] = useState(null);

  const selectedDay = tripDays.find((d) => d.key === selectedKey) || null;
  const selectedPlan = selectedKey ? tripPlans[selectedKey] || null : null;

  return (
    <div
      className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center px-4 py-8"
      style={{
        background:
          "radial-gradient(120% 120% at 15% 10%, #fdfaf4 0%, #f5ecdd 45%, #ead9c2 100%)"
      }}
    >
      <div className="relative z-10 w-full max-w-3xl">
        <h1
          className="font-display text-4xl sm:text-6xl font-semibold tracking-tight text-center mb-8"
          style={{ color: "#1d3b5c" }}
        >
          Португалия 2026
        </h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {tripDays.map((day, i) => {
            const plan = tripPlans[day.key];
            return (
              <motion.button
                key={day.key}
                onClick={() => setSelectedKey(day.key)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, type: "spring", stiffness: 260, damping: 22 }}
                whileHover={{ y: -5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="relative aspect-[3/4] rounded-3xl p-4 text-left shadow-lg overflow-hidden group"
                style={{
                  background:
                    "linear-gradient(150deg, #1d3b5c 0%, #2c5f8a 60%, #3a7ca5 100%)"
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-3xl sm:text-4xl font-semibold text-white">
                    {day.label.split(" ")[0]}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {day.weekday}
                  </span>
                </div>
                <div className="text-white/70 text-xs sm:text-sm mt-0.5">
                  {day.label.split(" ")[1]}
                </div>

                <div className="mt-auto pt-6">
                  <div className="text-white/90 text-sm sm:text-base font-medium leading-tight">
                    {plan ? plan.city : "Португалия"}
                  </div>
                  <div className="flex items-center gap-1 text-white/55 text-xs mt-1">
                    {plan ? (
                      <>
                        <MapPin className="h-3 w-3" />День {plan.dayNumber}
                      </>
                    ) : (
                      <>
                        <Plane className="h-3 w-3" />
                        план скоро
                      </>
                    )}
                  </div>
                </div>

                <span
                  className="absolute bottom-0 left-0 h-1 w-0 group-hover:w-full transition-all duration-300"
                  style={{ backgroundColor: "#c4623a" }}
                />
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {selectedKey && (
          <DayPlanModal
            plan={selectedPlan}
            dayInfo={selectedDay}
            onClose={() => setSelectedKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}