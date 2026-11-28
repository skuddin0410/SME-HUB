// maple-admin: the Hub team's answer library and token report (Update 47).
// Only the Hub team (team_roles, the same rule as is_staff()) can call it.
// Actions (POST JSON { action, ... }):
//   list            all answers, newest first
//   save            create or edit an answer (re-embeds it); stays a draft until approved
//   approve         save, approve, and set when to check it again
//   retire          stop using an answer (kept for history)
//   repeated        questions the AI answered for 3+ members in 30 days (text and counts only)
//   draft           ask the small model for a first draft the team then edits
//   report          this month's questions and tokens by route
import { chat, embed, MODELS } from '../_shared/bedrock.ts'
import { caller, isHubTeam, json } from '../_shared/hub.ts'

const OFFICIAL = /gst|hst|tps|tvh|tax|grant|cra|legal|incorporat/i

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  const who = await caller(req)
  if (!who || !(await isHubTeam(who.db, who.user.id))) return json({ error: 'Hub team only.' }, 403)
  const { user, db } = who
  const body = await req.json().catch(() => ({}))

  switch (body.action) {
    case 'list': {
      const { data, error } = await db.from('maple_answers')
        .select('id, question, variants, answer, sources, lang, status, checked_on, review_by, times_used, tokens_saved, updated_at')
        .order('updated_at', { ascending: false }).limit(500)
      return error ? json({ error: error.message }, 500) : json({ answers: data })
    }
    case 'save':
    case 'approve': {
      const a = body.answer ?? {}
      const question = String(a.question ?? '').trim().slice(0, 300)
      const answer = String(a.answer ?? '').trim()
      const words = (answer.match(/\S+/g) ?? []).length
      const sources = (Array.isArray(a.sources) ? a.sources : [])
        .map((s: { title?: string; url?: string }) => ({ title: String(s?.title ?? '').trim().slice(0, 200), url: String(s?.url ?? '').trim() }))
        .filter((s: { title: string; url: string }) => s.title && /^https:\/\/[^\s<>"]{4,500}$/.test(s.url))
        .slice(0, 5)
      if (question.length < 5) return json({ error: 'Please write the question.' }, 400)
      if (words < 5) return json({ error: 'Please write the answer.' }, 400)
      if (words > 120) return json({ error: 'Keep the answer to 120 words or fewer. Short answers are cheaper and easier to read.' }, 400)
      if (body.action === 'approve' && OFFICIAL.test(`${question} ${answer}`) && !sources.length) return json({ error: 'Tax, legal and grant answers need an official source before approval.' }, 400)
      const variants = (Array.isArray(a.variants) ? a.variants : []).map((v: unknown) => String(v).trim().slice(0, 300)).filter(Boolean).slice(0, 10)
      let embedding: number[] | null = null
      try { embedding = await embed([question, ...variants].join('\n')) } catch (e) { console.error('maple embed', e) }
      if (body.action === 'approve' && !embedding) return json({ error: 'Maple can’t match answers yet (the AI connection isn’t set up). Save it as a draft for now.' }, 503)
      const months = [3, 6, 12].includes(Number(body.reviewMonths)) ? Number(body.reviewMonths) : 6
      const review = new Date(); review.setMonth(review.getMonth() + months)
      const row: Record<string, unknown> = {
        question, variants, answer, sources, lang: a.lang === 'fr' ? 'fr' : 'en',
        ...(embedding ? { embedding } : {}),
        ...(body.action === 'approve'
          ? { status: 'approved', approved_by: user.id, checked_on: new Date().toISOString().slice(0, 10), review_by: review.toISOString().slice(0, 10) }
          : { status: 'draft' }),                       // every edit goes back to draft for a second look
      }
      const id = Number(a.id) || 0
      const q = id
        ? db.from('maple_answers').update(row).eq('id', id)
        : db.from('maple_answers').insert({ ...row, created_by: user.id })
      const { data, error } = await q.select('id').single()
      return error ? json({ error: error.message }, 400) : json({ id: data.id })
    }
    case 'retire': {
      const { error } = await db.from('maple_answers').update({ status: 'retired' }).eq('id', Number(body.id) || 0)
      return error ? json({ error: error.message }, 400) : json({ ok: true })
    }
    case 'repeated': {
      const { data, error } = await db.rpc('maple_repeated_questions', { p_min_members: 3 })
      return error ? json({ error: error.message }, 500) : json({ questions: data })
    }
    case 'draft': {
      const q = String(body.question ?? '').slice(0, 300)
      if (!MODELS.small) return json({ draft: '' })
      try {
        const { text } = await chat(MODELS.small,
          'Write a short, plain-language answer (under 120 words) for Canadian small business owners. Say which official source the team should check. The Hub team will check every fact before it is used.',
          q, 300)
        return json({ draft: text })
      } catch (e) {
        console.error('maple draft', e)
        return json({ draft: '' })
      }
    }
    case 'report': {
      const month = new Date().toISOString().slice(0, 7) + '-01'
      const { data, error } = await db.from('maple_usage')
        .select('questions, hub_answers, library_answers, small_answers, large_answers, input_tokens, output_tokens, cached_tokens')
        .eq('month', month)
      if (error) return json({ error: error.message }, 500)
      // deno-lint-ignore no-explicit-any
      const sum = (k: string) => (data ?? []).reduce((n: number, r: any) => n + Number(r[k] ?? 0), 0)
      return json({
        month, members: data?.length ?? 0, questions: sum('questions'),
        byRoute: { hub: sum('hub_answers'), library: sum('library_answers'), small: sum('small_answers'), large: sum('large_answers') },
        tokens: { input: sum('input_tokens'), output: sum('output_tokens'), cached: sum('cached_tokens') },
      })
    }
    default:
      return json({ error: 'Unknown action.' }, 400)
  }
})
