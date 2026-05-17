import re
from pathlib import Path
DOWNLOADS = Path("/mnt/c/Users/Infraestrutura-IMTS/Downloads")
EXPECTED = ["organizations","profiles","user_roles","empresas","departamentos","usuarios","ativos","dominios","dns_records","licencas","servidores","contratos","manutencoes","movimentacoes","inventario","inventario_movimentacoes","alertas","orcamentos","acoes_economista","registros_acesso","riscos","pagamentos","termos_responsabilidade"]
def table_from_name(name):
    m = re.match(r"^(.+?)-export-", name)
    return m.group(1) if m else name
def sort_key(path):
    base = re.sub(r" \(\d+\)(?=\.csv$)", "", path.name)
    m = re.search(r"-export-(.+)\.csv$", base)
    return (m.group(1) if m else "", path.name)
files = sorted(DOWNLOADS.glob("*-export-*.csv"))
by_table = {}
for p in files:
    by_table.setdefault(table_from_name(p.name), []).append(p)
chosen = {t: max(paths, key=sort_key) for t, paths in by_table.items()}
def analyze(path):
    lines = path.read_text(encoding="utf-8-sig", errors="replace").splitlines()
    if not lines: return "", 0, ""
    header = lines[0]
    cols = header.split(";")
    data = [ln for ln in lines[1:] if ln.strip()]
    id_idx = next((i for i, c in enumerate(cols) if c.strip().lower() == "id"), 0)
    first_id = data[0].split(";")[id_idx].strip() if data and id_idx < len(data[0].split(";")) else ""
    return header, len(data), first_id
for t in EXPECTED:
    p = chosen[t]
    h, n, fid = analyze(p)
    print(f"{t}|{p.name}|{n}|{fid}")
print("UNEXPECTED:", [t for t in chosen if t not in EXPECTED])
