import { useI18n } from "@/context/I18nContext";

const SERVICES = [
  {
    icon: "\ud83d\udcdd",
    titleKey: "about_service_content",
    descKey: "about_service_content_desc",
  },
  {
    icon: "\ud83e\uddca",
    titleKey: "about_service_3d",
    descKey: "about_service_3d_desc",
  },
  {
    icon: "\ud83d\uded2",
    titleKey: "about_service_store",
    descKey: "about_service_store_desc",
  },
] as const;

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-12">
      {/* Header */}
      <header className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">{t("about_title")}</h1>
        <p className="text-sm text-secondary">
          {t("about_subtitle")}
        </p>
      </header>

      {/* Mission */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t("about_mission_title")}
        </h2>
        <p className="text-sm leading-relaxed text-secondary">
          {t("about_mission_text")}
        </p>
      </section>

      {/* Services */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          {t("about_services_title")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {SERVICES.map(({ icon, titleKey, descKey }) => (
            <div
              key={titleKey}
              className="rounded-lg border border-border-default bg-surface-raised p-5"
            >
              <span
                className="text-2xl"
                role="img"
                aria-hidden="true"
              >
                {icon}
              </span>
              <h3 className="mt-2 text-sm font-semibold">
                {t(titleKey)}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-secondary">
                {t(descKey)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          {t("about_contact_title")}
        </h2>
        <p className="text-sm text-secondary">
          {t("about_contact_text")}
        </p>
        <p className="text-sm">
          <span className="font-medium">
            {t("about_email_label")}:
          </span>{" "}
          <a
            href={`mailto:${t("about_email_value")}`}
            className="text-accent hover:underline"
          >
            {t("about_email_value")}
          </a>
        </p>
      </section>
    </div>
  );
}
