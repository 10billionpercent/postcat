from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
import aiosqlite
from ..database import get_db
from ..schemas import (
    EnvironmentCreate, EnvironmentUpdate, EnvironmentOut,
    VariableCreate, VariableUpdate, VariableOut
)

router = APIRouter()

# ===== Environments =====
@router.get("/environments", response_model=List[EnvironmentOut])
async def list_environments(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name FROM environments ORDER BY name")
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]

@router.get("/environments/{env_id}", response_model=EnvironmentOut)
async def get_environment(env_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name FROM environments WHERE id = ?", (env_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Environment not found")
    return dict(row)

@router.post("/environments", response_model=EnvironmentOut)
async def create_environment(data: EnvironmentCreate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "INSERT INTO environments (name) VALUES (?)",
        (data.name,)
    )
    await db.commit()
    new_id = cursor.lastrowid
    cursor = await db.execute("SELECT id, name FROM environments WHERE id = ?", (new_id,))
    row = await cursor.fetchone()
    return dict(row)

@router.patch("/environments/{env_id}", response_model=EnvironmentOut)
async def update_environment(env_id: int, data: EnvironmentUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "UPDATE environments SET name = ? WHERE id = ?",
        (data.name, env_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Environment not found")
    await db.commit()
    cursor = await db.execute("SELECT id, name FROM environments WHERE id = ?", (env_id,))
    row = await cursor.fetchone()
    return dict(row)

@router.delete("/environments/{env_id}")
async def delete_environment(env_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await db.execute("DELETE FROM environment_variables WHERE environment_id = ?", (env_id,))
    cursor = await db.execute("DELETE FROM environments WHERE id = ?", (env_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Environment not found")
    await db.commit()
    return {"message": "Deleted"}

# ===== Variables =====
@router.get("/environments/{env_id}/variables", response_model=List[VariableOut])
async def list_variables(env_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM environments WHERE id = ?", (env_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Environment not found")
    cursor = await db.execute(
        "SELECT id, environment_id, key, value FROM environment_variables WHERE environment_id = ? ORDER BY key",
        (env_id,)
    )
    rows = await cursor.fetchall()
    return [dict(row) for row in rows]

@router.post("/environments/{env_id}/variables", response_model=VariableOut)
async def create_variable(env_id: int, data: VariableCreate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM environments WHERE id = ?", (env_id,))
    if not await cursor.fetchone():
        raise HTTPException(status_code=404, detail="Environment not found")
    cursor = await db.execute(
        "INSERT INTO environment_variables (environment_id, key, value) VALUES (?, ?, ?)",
        (env_id, data.key, data.value)
    )
    await db.commit()
    new_id = cursor.lastrowid
    cursor = await db.execute(
        "SELECT id, environment_id, key, value FROM environment_variables WHERE id = ?",
        (new_id,)
    )
    row = await cursor.fetchone()
    return dict(row)

@router.patch("/environments/{env_id}/variables/{var_id}", response_model=VariableOut)
async def update_variable(env_id: int, var_id: int, data: VariableUpdate, db: aiosqlite.Connection = Depends(get_db)):
    updates = []
    values = []
    if data.key is not None:
        updates.append("key = ?")
        values.append(data.key)
    if data.value is not None:
        updates.append("value = ?")
        values.append(data.value)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    values.extend([var_id, env_id])
    await db.execute(
        f"UPDATE environment_variables SET {', '.join(updates)} WHERE id = ? AND environment_id = ?",
        values
    )
    await db.commit()
    cursor = await db.execute(
        "SELECT id, environment_id, key, value FROM environment_variables WHERE id = ?",
        (var_id,)
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Variable not found")
    return dict(row)

@router.delete("/environments/{env_id}/variables/{var_id}")
async def delete_variable(env_id: int, var_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "DELETE FROM environment_variables WHERE id = ? AND environment_id = ?",
        (var_id, env_id)
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Variable not found")
    await db.commit()
    return {"message": "Deleted"}