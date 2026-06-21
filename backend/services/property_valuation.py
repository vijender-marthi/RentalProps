"""Fetch property valuations from public sources (Zillow/Redfin)."""
import httpx
from typing import Optional, Dict, Any


async def get_zillow_estimate(address: str, city: str, state: str, zip_code: str) -> Optional[Dict[str, Any]]:
    """
    Fetch Zestimate via Zillow's unofficial API / RapidAPI wrapper.
    Requires ZILLOW_API_KEY env variable with a RapidAPI key.
    Falls back gracefully if not configured.
    """
    import os
    api_key = os.getenv("ZILLOW_API_KEY")
    if not api_key:
        return None

    full_address = f"{address}, {city}, {state} {zip_code}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://zillow-com1.p.rapidapi.com/property",
                params={"address": full_address},
                headers={
                    "X-RapidAPI-Key": api_key,
                    "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com",
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                zestimate = data.get("zestimate") or data.get("price")
                return {
                    "value": zestimate,
                    "source": "zillow",
                    "raw": data,
                }
    except Exception as e:
        print(f"Zillow API error: {e}")
    return None


async def get_redfin_estimate(address: str, city: str, state: str) -> Optional[Dict[str, Any]]:
    """
    Redfin doesn't have a public API. This is a placeholder.
    In production, use a scraping service or data vendor.
    """
    return None


async def get_property_value(
    address: str, city: str, state: str, zip_code: str
) -> Dict[str, Any]:
    """Try Zillow first, then Redfin, return None value if both fail."""
    result = await get_zillow_estimate(address, city, state, zip_code)
    if result and result.get("value"):
        return result

    result = await get_redfin_estimate(address, city, state)
    if result and result.get("value"):
        return result

    return {"value": None, "source": "not_available", "message": "No API key configured. Set ZILLOW_API_KEY env variable."}
