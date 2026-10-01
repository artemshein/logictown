# Firefox performance measurement — 2026-10-01

Measured on the user's MacBook Pro (Apple M3 Pro, 11 CPU cores, 36 GB RAM), Firefox 156.0, macOS. The OS version in Firefox's user-agent is compatibility information, not the installed OS version.

Compared `25fe752` (furniture additions, before optimization) with `ae618e8` (optimization). All measurements used the same Firefox tab, CSS viewport 1352 × 684, stationary bedroom scene and camera, with 1975 scene meshes. Remaining room assets loaded before measurement. Each run had 15 seconds of warmup and 30 seconds of sampling. Other browser tabs were left untouched. Tests used Vite development servers and instrumented temporary source snapshots; this is not a production benchmark.

| Run | Render buffer | FPS | Mean frame, ms | p95 frame, ms | CPU render submission, ms/frame |
| --- | --- | ---: | ---: | ---: | ---: |
| Before | 2028 × 1026 | 23.67 | 42.25 | 48 | 18.89 |
| After, all changes | 1690 × 855 | 59.99 | 16.67 | 22 | 10.85 |
| Before, only SSAO disabled | 2028 × 1026 | 53.39 | 18.73 | 21 | 17.81 |
| Before, only pipeline MSAA disabled | 2028 × 1026 | 25.08 | 39.88 | 46 | 17.27 |
| Before, repeat | 2028 × 1026 | 24.68 | 40.51 | 46 | 17.41 |

SSAO was the dominant measured effect in this scene: disabling it alone more than doubled FPS while retaining the original resolution, shadows, bloom and pipeline MSAA. Disabling pipeline MSAA alone had a small effect within the spread of the baseline repeats. The complete optimization reached its 60 FPS cap. Its render buffer contained about 31% fewer pixels. Adaptive resolution did not reduce below the initial 1.25 scale in this run.

This supports the performance benefit of the optimization and identifies SSAO as a substantial contributor on this Mac in Firefox. It does not prove a Firefox-specific bug or establish performance relative to Safari, a desktop or a phone. The FPS cap was not the explanation for the original 24 FPS in this scene.

The GPU timer returned no samples (`gpuMs: null`). CPU render submission timing covers Babylon's scene render observers; it is not total browser CPU utilization, GPU time or energy usage. Temperature, battery consumption and fan speed were not measured. Increased FPS does not by itself prove lower power consumption. Browser-wide CPU sampling was excluded from results because unrelated tabs were running. Results apply to this stationary scene; movement, other rooms and long-term heating require separate runs.

Raw samples summarized by run are in `firefox-m3-pro-2026-10-01.jsonl`.

To repeat: run `node scripts/benchmark-firefox.mjs`, open the printed before/after URLs in the same Firefox tab, remain in the bedroom and wait for the result overlay. On the before URL, `?experiment=ssao` disables only SSAO; `?experiment=msaa` disables only pipeline MSAA. Repeat the baseline after the ablations. Results are written to the temporary directory printed by the runner. The runner leaves the checkout and historical commits unchanged; stop it with Ctrl+C.
