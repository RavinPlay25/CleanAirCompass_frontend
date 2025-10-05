import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen pb-16">
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 mt-8">
        <div className="relative overflow-hidden rounded-3xl border border-[var(--border)] shadow-soft">
          {/* local hero image */}
          <img src="/hero.jpg" alt="hero" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-transparent" />

          <div className="relative grid lg:grid-cols-2 gap-6 p-6 md:p-10 text-white">
            <div>
              <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.05]">
                Eco-Travel
                <br />
                The clean pulse of{" "}
                <span
                  className="inline-block"
                  style={{
                    background: "linear-gradient(90deg, #86efac 0%, #a7f3d0 45%, #ffffff 100%)",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  modern tourism
                </span>
              </h1>

              <p className="mt-4 max-w-xl text-white/85">
                Healthy-air trip planning: find safe windows, compare destinations,
                and reduce exposure without sacrificing experience.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/hotspot"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold text-white"
                  style={{ background: "linear-gradient(90deg,#16a34a,#4ade80)" }}
                >
                  Explore on map
                </Link>
                <Link
                  href="/predictor"
                  className="px-5 py-2.5 rounded-full text-sm font-semibold border border-white/30 bg-white/10 text-white hover:bg-white/20"
                >
                  Manual predictor
                </Link>
              </div>
            </div>

            {/* floating card */}
            <div className="hidden lg:block">
              <div className="ml-auto w-full max-w-md bg-white rounded-2xl shadow-soft border border-[var(--border)] p-3 mt-8">
                <img src="/card-1.jpg" alt="case" className="h-48 w-full object-cover rounded-xl" />
                <div className="p-3">
                  <div className="text-xs font-semibold text-emerald-700 bg-emerald-100 inline-block px-2 py-1 rounded-full">
                    Case study
                  </div>
                  <h3 className="mt-2 font-semibold">How a city improved clean-day rates</h3>
                  <p className="text-[var(--muted)] text-sm mt-1">
                    Using clean windows, operators shifted demand by 3–5 days and cut cancellations 18%.
                  </p>
                  <Link href="/hotspot" className="mt-3 inline-block text-sm font-medium text-emerald-700 hover:underline">
                    Read more →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DRIVING CHANGE */}
      <section className="mx-auto max-w-5xl px-4 mt-12 text-center">
        <div className="text-xs tracking-widest font-semibold text-emerald-700 bg-emerald-100 inline-block px-3 py-1 rounded-full">
          DRIVING CHANGE
        </div>
        <h2 className="mt-3 text-2xl md:text-4xl font-bold text-[var(--text)]">
          We make sustainable travel planning effortless by
          <span className="text-emerald-600"> reducing exposure</span> and
          <span className="text-emerald-600"> increasing comfort</span>.
        </h2>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <img className="rounded-3xl border border-[var(--border)] shadow-soft h-80 w-full object-cover" src="/card-1.jpg" alt="road" />
          <img className="rounded-3xl border border-[var(--border)] shadow-soft h-80 w-full object-cover" src="/card-2.jpg" alt="wind" />
          <img className="rounded-3xl border border-[var(--border)] shadow-soft h-80 w-full object-cover" src="/card-3.jpg" alt="forest" />
        </div>

        <Link
          href="/hotspot"
          className="mt-8 inline-block rounded-full px-5 py-2.5 text-sm font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#16a34a,#4ade80)" }}
        >
          Open Planner
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto max-w-6xl px-4 mt-16 text-sm text-[var(--muted)]">
        <div className="border-t border-[var(--border)] pt-6 pb-10 flex flex-col md:flex-row items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} CleanAir Compass</span>
          <div className="flex gap-4">
            <a className="hover:underline" href="#">Privacy</a>
            <a className="hover:underline" href="#">Terms</a>
            <a className="hover:underline" href="#">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
