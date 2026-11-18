# PyScript entry: exposes the Python labs to the page's JavaScript.
import json
from pyscript import window
from pyodide.ffi import create_proxy
import showcase


def run(name: str, params: str) -> str:
  try:
    return json.dumps(dict(ok=True, data=showcase.RUNNERS[str(name)](**json.loads(str(params)))))
  except Exception as e:  # surface failures in the UI instead of hanging it
    return json.dumps(dict(ok=False, error=f'{type(e).__name__}: {e}'))


window.pyRun = create_proxy(run)
window.dispatchEvent(window.CustomEvent.new('py-ready'))
