/* ============================================================
   page-exercise-what-is-prompting.jsx — first exercise
   Route: #/exercises/what-is-prompting
   ============================================================ */

function ExerciseWhatIsPromptingPage() {
  const { t } = useApp();
  return (
    <div className="page exercise-page">
      <div className="page-head">
        <h1 className="h1">{t("exerciseWhatIsPromptingTitle")}</h1>
      </div>
      <button type="button" className="exercise-submit-btn">{t("exerciseSubmit")}</button>
    </div>
  );
}

Object.assign(window, { ExerciseWhatIsPromptingPage });
