export type AppContext = {
  lang: string
  unit?: string
}

function readParams(): AppContext {
  const params = new URLSearchParams(window.location.search)

  return {
    lang: params.get("lang") ?? "en",
    unit: params.get("unit") ?? undefined
  }
}

export const APP_CONTEXT: AppContext = readParams()
