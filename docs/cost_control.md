# Cost Control

H200 usage can be expensive. Phase 2 is configured for private testing, not always-on production.

## Built-In Controls

The Modal SGLang function uses:

- `min_containers=0` so it can scale to zero.
- `scaledown_window=10 * 60` so idle GPUs shut down after a short warm period.
- `max_containers=1` so accidental concurrent traffic does not create multiple H200 pairs.
- A persistent Hugging Face cache volume so restarts do not repeatedly download the model.

## Provider Budget Router

Phase 2.5 adds a private multi-provider budget router for pre-authorized group endpoints. Each provider can define:

- monthly budget, default `$30`
- warning threshold, default `90%`
- stop threshold, default `95%`
- reset day, default `1`
- soft stop, default enabled
- hard stop, default disabled
- lazy activation, default enabled

Provider routing uses local ignored files:

```text
.borger/providers.local.json
.borger/usage-ledger.jsonl
.borger/provider-state.json
```

The ledger estimates spend from elapsed model request time and `BORGER_MODAL_H200_PAIR_HOURLY_COST_USD`, default `9.08`.

Borger also has a defensive exact-billing hook: if `BORGER_MODAL_BILLING_REPORT_PATH` points to a readable local JSON billing report, it can use provider spend from that file. If the report is missing, unreadable, or in an unexpected shape, Borger falls back to the estimated ledger strategy without crashing.

## Monthly Renewal and Lazy Activation

Modal monthly credit renewal does not start GPU usage by itself. Borger treats renewal as a local state reset only.

When the reset date arrives, Borger may mark a budget-paused provider as `reset_pending` or `active`, clear estimated spend, and recalculate the next reset date. It must not:

- call the provider
- warm the model
- run smoke tests
- wake a Modal deployment

The provider starts consuming credit again only when the user sends a real coding task or manually runs `Borger: Test Model Connection`.

## Soft Stop and Hard Stop

Soft stop is recommended. It marks the provider as paused in Borger and lets Modal's normal `scaledown_window` take the GPU to zero. It does not delete or redeploy the Modal app.

Hard stop is optional and disabled by default. If enabled in a future provider workflow, it may run `modal app stop <app-name> --yes` and may require manual redeployment next month.

## Avoid Idle Spend

Use the endpoint only while testing:

```powershell
$env:BORGER_MODAL_ENDPOINT="https://your-workspace--borger-qwen3-coder-next-h200-serve.modal.run"
python scripts/smoke_test_modal_endpoint.py
```

After testing, confirm the app has scaled down in the Modal dashboard.

## Shut Down

Use the Modal dashboard to stop or delete the deployed app when you are done for the day.

You can also inspect deployments with:

```powershell
modal app list
```

## First-Run Cost Note

The first startup can take longer because the model is downloaded and cached. That startup uses H200 time while SGLang initializes, so do the first smoke test when you can watch the logs.

## Risk Areas

- Large model size can increase download and startup time.
- SGLang flags may change between image versions.
- Higher concurrency can increase memory pressure.
- Setting `min_containers` above `0` keeps GPUs warm and increases cost.
