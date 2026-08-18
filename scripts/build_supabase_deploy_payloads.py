from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = Path('/tmp/idealy-supabase-deploy')
OUT.mkdir(parents=True, exist_ok=True)

FUNCTIONS = {
    'ai-proxy': [('index.ts', 'supabase/functions/ai-proxy/index.ts')],
    'check-subscription': [('index.ts', 'supabase/functions/check-subscription/index.ts')],
    'create-billing-portal': [('index.ts', 'supabase/functions/create-billing-portal/index.ts')],
    'cancel-subscription': [('index.ts', 'supabase/functions/cancel-subscription/index.ts')],
    'integration-connect': [
        ('index.ts', 'supabase/functions/integration-connect/index.ts'),
        ('../_shared/auth.ts', 'supabase/functions/_shared/auth.ts'),
        ('../_shared/cors.ts', 'supabase/functions/_shared/cors.ts'),
        ('deno.json', 'supabase/functions/stripe-webhook/deno.json'),
    ],
    'integration-callback': [
        ('index.ts', 'supabase/functions/integration-callback/index.ts'),
        ('../_shared/integrationCrypto.ts', 'supabase/functions/_shared/integrationCrypto.ts'),
        ('deno.json', 'supabase/functions/stripe-webhook/deno.json'),
    ],
    'process-ai-request': [
        ('index.ts', 'supabase/functions/process-ai-request/index.ts'),
        ('aiProvider.ts', 'supabase/functions/process-ai-request/aiProvider.ts'),
        ('intentRouter.ts', 'supabase/functions/process-ai-request/intentRouter.ts'),
        ('streamUI.ts', 'supabase/functions/process-ai-request/streamUI.ts'),
    ],
    'integration-status': [
        ('index.ts', 'supabase/functions/integration-status/index.ts'),
        ('../_shared/auth.ts', 'supabase/functions/_shared/auth.ts'),
        ('../_shared/cors.ts', 'supabase/functions/_shared/cors.ts'),
    ],
    'github-export': [
        ('index.ts', 'supabase/functions/github-export/index.ts'),
        ('../_shared/auth.ts', 'supabase/functions/_shared/auth.ts'),
        ('../_shared/cors.ts', 'supabase/functions/_shared/cors.ts'),
        ('../_shared/integrationCrypto.ts', 'supabase/functions/_shared/integrationCrypto.ts'),
        ('deno.json', 'supabase/functions/stripe-webhook/deno.json'),
    ],
    'vercel-deploy': [
        ('index.ts', 'supabase/functions/vercel-deploy/index.ts'),
        ('../_shared/auth.ts', 'supabase/functions/_shared/auth.ts'),
        ('../_shared/cors.ts', 'supabase/functions/_shared/cors.ts'),
    ],
    'vercel-status': [
        ('index.ts', 'supabase/functions/vercel-status/index.ts'),
        ('../_shared/auth.ts', 'supabase/functions/_shared/auth.ts'),
        ('../_shared/cors.ts', 'supabase/functions/_shared/cors.ts'),
    ],
    'stripe-webhook': [
        ('index.ts', 'supabase/functions/stripe-webhook/index.ts'),
        ('stripe-webhook.ts', 'supabase/functions/stripe-webhook/stripe-webhook.ts'),
        ('deno.json', 'supabase/functions/stripe-webhook/deno.json'),
    ],
}

for name, entries in FUNCTIONS.items():
    files = []
    for remote_name, local_path in entries:
        files.append({'name': remote_name, 'content': (ROOT / local_path).read_text(encoding='utf-8')})
    payload = {
        'project_id': 'vhucjkyktdflwocrmzhe',
        'name': name,
        'entrypoint_path': 'index.ts',
        'verify_jwt': name not in {'stripe-webhook', 'integration-callback'},
        'files': files,
    }
    if name in {'stripe-webhook', 'integration-callback', 'integration-connect', 'github-export'}:
        payload['import_map_path'] = 'deno.json'
    (OUT / f'{name}.json').write_text(json.dumps(payload, ensure_ascii=False), encoding='utf-8')
print(f'generated {len(FUNCTIONS)} payloads in {OUT}')
