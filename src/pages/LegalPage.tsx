import { useI18n } from "@/context/I18nContext";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-lg font-semibold text-primary">{title}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-secondary">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage() {
  const { t } = useI18n();

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      {/* Privacy Policy */}
      <article>
        <h2 className="mb-2 text-2xl font-bold text-primary">
          {t("legal_privacy_title")}
        </h2>
        <p className="mb-6 text-xs text-tertiary">
          {t("legal_privacy_effective")}
        </p>

        <Section title={t("legal_privacy_intro_title")}>
          <p>{t("legal_privacy_intro_text")}</p>
        </Section>

        <Section title={t("legal_privacy_collect_title")}>
          <p>{t("legal_privacy_collect_text")}</p>
        </Section>

        <Section title={t("legal_privacy_purpose_title")}>
          <p>{t("legal_privacy_purpose_text")}</p>
        </Section>

        <Section title={t("legal_privacy_storage_title")}>
          <p>{t("legal_privacy_storage_text")}</p>
        </Section>

        <Section title={t("legal_privacy_third_party_title")}>
          <p>{t("legal_privacy_third_party_text")}</p>
        </Section>

        <Section title={t("legal_privacy_security_title")}>
          <p>{t("legal_privacy_security_text")}</p>
        </Section>

        <Section title={t("legal_privacy_rights_title")}>
          <p>{t("legal_privacy_rights_text")}</p>
        </Section>

        <Section title={t("legal_privacy_retention_title")}>
          <p>{t("legal_privacy_retention_text")}</p>
        </Section>

        <Section title={t("legal_privacy_changes_title")}>
          <p>{t("legal_privacy_changes_text")}</p>
        </Section>

        <Section title={t("legal_privacy_contact_title")}>
          <p>{t("legal_privacy_contact_text")}</p>
        </Section>
      </article>

      <hr className="border-border-default" />

      {/* Terms of Service */}
      <article>
        <h2 className="mb-2 text-2xl font-bold text-primary">
          {t("legal_tos_title")}
        </h2>
        <p className="mb-6 text-xs text-tertiary">
          {t("legal_tos_effective")}
        </p>

        <Section title={t("legal_tos_intro_title")}>
          <p>{t("legal_tos_intro_text")}</p>
        </Section>

        <Section title={t("legal_tos_use_title")}>
          <p>{t("legal_tos_use_text")}</p>
        </Section>

        <Section title={t("legal_tos_ip_title")}>
          <p>{t("legal_tos_ip_text")}</p>
        </Section>

        <Section title={t("legal_tos_store_title")}>
          <p>{t("legal_tos_store_text")}</p>
        </Section>

        <Section title={t("legal_tos_disclaimer_title")}>
          <p>{t("legal_tos_disclaimer_text")}</p>
        </Section>

        <Section title={t("legal_tos_liability_title")}>
          <p>{t("legal_tos_liability_text")}</p>
        </Section>

        <Section title={t("legal_tos_changes_title")}>
          <p>{t("legal_tos_changes_text")}</p>
        </Section>

        <Section title={t("legal_tos_governing_title")}>
          <p>{t("legal_tos_governing_text")}</p>
        </Section>
      </article>
    </div>
  );
}
