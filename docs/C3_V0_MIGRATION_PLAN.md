# C3-V0 Migration Plan

## Target Directory Structure

```text
C3-V0/
  src/app/
    page.tsx
    layout.tsx
    globals.css
    api/
      llm-proxy/route.ts
      image-proxy/route.ts
      tavily-proxy/route.ts
      prompt-engine/route.ts
      knowledge-base/list/route.ts
  src/components/
    workspace/CopilotWorkbench.tsx
    ui/{button,card,input,label,select,textarea,badge}.tsx
  src/lib/
    prompt-engine.ts
    knowledge-retriever.ts
    llm.ts
    types.ts
    utils.ts
  prompts/
  ai-knowledge-base-v3.2/
```

## Core Type Design

- `ApiConfig`: local-only browser API settings for text, image and hotspot search.
- `BriefInput`: content type, topic, target user, materials, blogger level, embed level and generation mode.
- `CreativeAngle`: angle matrix item returned by the Prompt Engine + LLM.
- `GeneratedContent`: one generated Xiaohongshu content asset, including titles, body, image prompt and score.
- `ComplianceReport`: review result with risk findings, readiness and quality score.
- `Draft`: localStorage draft record with generation snapshot.
- `KnowledgeRetrievalResult`: selected product features, templates, phrase groups and compliance rules.

## Migration Plan

1. Preserve G12 and create all C3-V0 code in the new folder.
2. Copy `prompts/` and `ai-knowledge-base-v3.2/` into C3-V0.
3. Port `prompt-engine.js` and `knowledge-retriever.js` into typed server-side modules.
4. Replace `server.js` with Next.js Route Handlers for LLM, image, hotspot, prompt and knowledge APIs.
5. Implement a minimal five-step client workflow using localStorage for API config, materials and drafts.
6. Keep image generation as an entry point in V0, with prompt display and `/api/image-proxy` ready for later full image lab migration.
7. Defer G4/G6/G9 integration, database storage, publishing and analytics until later versions.
