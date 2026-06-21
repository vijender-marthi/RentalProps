"""Loan amortization and scenario calculations."""
import math
from typing import List, Dict, Any


def monthly_payment(principal: float, annual_rate: float, years: int) -> float:
    """Calculate fixed monthly payment."""
    if annual_rate == 0:
        return principal / (years * 12)
    r = annual_rate / 100 / 12
    n = years * 12
    return principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)


def amortization_schedule(
    principal: float,
    annual_rate: float,
    years: int,
    extra_monthly: float = 0.0,
    start_date: str = None,
) -> List[Dict[str, Any]]:
    """Generate full amortization schedule with optional extra payment."""
    r = annual_rate / 100 / 12
    n = years * 12
    if r == 0:
        base_payment = principal / n
    else:
        base_payment = principal * (r * (1 + r) ** n) / ((1 + r) ** n - 1)

    total_payment = base_payment + extra_monthly
    balance = principal
    schedule = []
    total_interest = 0.0

    for month in range(1, n + 1):
        if balance <= 0:
            break
        interest = balance * r
        principal_paid = min(total_payment - interest, balance)
        balance = max(balance - principal_paid, 0)
        total_interest += interest
        schedule.append({
            "month": month,
            "payment": round(base_payment + extra_monthly, 2),
            "principal": round(principal_paid, 2),
            "interest": round(interest, 2),
            "balance": round(balance, 2),
            "total_interest_paid": round(total_interest, 2),
        })
        if balance == 0:
            break

    return schedule


def payoff_analysis(
    principal: float,
    annual_rate: float,
    years: int,
    extra_monthly: float = 0.0,
) -> Dict[str, Any]:
    """Compare payoff with and without extra payments."""
    base_schedule = amortization_schedule(principal, annual_rate, years, 0)
    extra_schedule = amortization_schedule(principal, annual_rate, years, extra_monthly)

    base_months = len(base_schedule)
    extra_months = len(extra_schedule)

    base_interest = base_schedule[-1]["total_interest_paid"] if base_schedule else 0
    extra_interest = extra_schedule[-1]["total_interest_paid"] if extra_schedule else 0

    return {
        "base_months": base_months,
        "extra_months": extra_months,
        "months_saved": base_months - extra_months,
        "years_saved": round((base_months - extra_months) / 12, 1),
        "base_total_interest": round(base_interest, 2),
        "extra_total_interest": round(extra_interest, 2),
        "interest_saved": round(base_interest - extra_interest, 2),
        "extra_payment": extra_monthly,
    }


def arm_schedule(
    principal: float,
    initial_rate: float,
    initial_period_years: int,
    adjustment_period_years: int,
    rate_cap: float,
    margin: float,
    total_years: int,
    rate_adjustments: List[float] = None,  # future rates to simulate
) -> List[Dict[str, Any]]:
    """ARM amortization schedule with rate adjustments."""
    schedule = []
    balance = principal
    current_rate = initial_rate
    total_interest = 0.0

    if rate_adjustments is None:
        # simulate worst case: rate goes to cap
        rate_adjustments = [min(initial_rate + 2 * (i + 1), rate_cap)
                            for i in range(total_years // adjustment_period_years + 1)]

    adjustment_idx = 0
    initial_months = initial_period_years * 12

    for month in range(1, total_years * 12 + 1):
        if balance <= 0:
            break

        # Switch rate after initial period
        if month > initial_months:
            adj_num = (month - initial_months - 1) // (adjustment_period_years * 12)
            if adj_num < len(rate_adjustments):
                current_rate = rate_adjustments[adj_num]

        r = current_rate / 100 / 12
        remaining_months = total_years * 12 - month + 1
        if r == 0:
            payment = balance / remaining_months
        else:
            payment = balance * (r * (1 + r) ** remaining_months) / \
                      ((1 + r) ** remaining_months - 1)

        interest = balance * r
        principal_paid = payment - interest
        balance = max(balance - principal_paid, 0)
        total_interest += interest

        schedule.append({
            "month": month,
            "rate": round(current_rate, 3),
            "payment": round(payment, 2),
            "principal": round(principal_paid, 2),
            "interest": round(interest, 2),
            "balance": round(balance, 2),
            "total_interest_paid": round(total_interest, 2),
        })

    return schedule


def depreciation_schedule(
    property_value: float,
    land_value: float,
    depreciation_years: int = 27,
) -> Dict[str, Any]:
    """Annual depreciation for rental property (straight-line)."""
    depreciable_basis = property_value - land_value
    annual_depreciation = depreciable_basis / depreciation_years
    return {
        "depreciable_basis": round(depreciable_basis, 2),
        "annual_depreciation": round(annual_depreciation, 2),
        "monthly_depreciation": round(annual_depreciation / 12, 2),
        "depreciation_years": depreciation_years,
    }
