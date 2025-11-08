window.addEventListener('message', async (e) => {
    if (e.data?.type === 'RUN_GEMINI') {
      try {
        const session = await LanguageModel.create({ outputLanguage: 'en' });
        const result = await session.prompt(e.data.prompt);
        window.postMessage({ type: 'GEMINI_RESULT', result, id: e.data.id }, '*');
      } catch (err) {
        window.postMessage({ type: 'GEMINI_ERROR', error: err.message, id: e.data.id }, '*');
      }
    }
  });
  