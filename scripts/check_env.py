"""Basic environment checker placeholder for later phases."""

import os

for key in ("BORGER_LITELLM_BASE_URL", "BORGER_MODEL"):
    print(f"{key}={os.getenv(key, '<unset>')}")
