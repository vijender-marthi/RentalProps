from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
import models
from database import get_db
from routers.auth import get_current_user

router = APIRouter(prefix="/api/sharing", tags=["sharing"])


class ShareRequest(BaseModel):
    email: str


class SharingOut(BaseModel):
    id: int
    owner_id: int
    owner_email: str
    owner_name: str
    shared_with_id: int
    shared_with_email: str
    shared_with_name: str

    class Config:
        from_attributes = True


@router.get("")
def list_sharing(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return shares I created (given) and shares others created for me (received)."""
    given = db.query(models.UserSharing).filter(
        models.UserSharing.owner_id == current_user.id
    ).all()
    received = db.query(models.UserSharing).filter(
        models.UserSharing.shared_with_id == current_user.id
    ).all()

    def _fmt(row: models.UserSharing):
        return {
            "id": row.id,
            "owner_id": row.owner_id,
            "owner_email": row.owner.email,
            "owner_name": row.owner.name,
            "shared_with_id": row.shared_with_id,
            "shared_with_email": row.shared_with.email,
            "shared_with_name": row.shared_with.name,
        }

    return {
        "given": [_fmt(r) for r in given],
        "received": [_fmt(r) for r in received],
    }


@router.post("")
def share_with_user(
    body: ShareRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Share my portfolio view with another registered user by email."""
    if body.email.lower() == current_user.email.lower():
        raise HTTPException(status_code=400, detail="Cannot share with yourself")

    target = db.query(models.User).filter(
        models.User.email == body.email.lower()
    ).first()
    if not target:
        raise HTTPException(
            status_code=404,
            detail=f"No account found for {body.email}. They must register first."
        )

    existing = db.query(models.UserSharing).filter(
        models.UserSharing.owner_id == current_user.id,
        models.UserSharing.shared_with_id == target.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already shared with this user")

    share = models.UserSharing(owner_id=current_user.id, shared_with_id=target.id)
    db.add(share)
    db.commit()
    db.refresh(share)

    return {
        "id": share.id,
        "owner_id": share.owner_id,
        "owner_email": current_user.email,
        "owner_name": current_user.name,
        "shared_with_id": target.id,
        "shared_with_email": target.email,
        "shared_with_name": target.name,
    }


@router.delete("/{share_id}")
def remove_share(
    share_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a share. Owner can revoke; recipient can also opt out."""
    share = db.query(models.UserSharing).filter(models.UserSharing.id == share_id).first()
    if not share:
        raise HTTPException(status_code=404, detail="Share not found")
    if share.owner_id != current_user.id and share.shared_with_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your share")

    db.delete(share)
    db.commit()
    return {"ok": True}
