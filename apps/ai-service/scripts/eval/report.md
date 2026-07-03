# Evaluación RAG — GrowthSI
_Generado: 2026-06-04 00:41 UTC_

## Parte B — Operación / negocio

| Indicador | Valor |
|---|---|
| Aceptación escenarios IA | 60.0% (6/10) |
| Aceptación controles IA | 22.6% (7/31) |

### Uso/coste por operación (ia_uso)

| Operación | Llamadas | Tokens in | Tokens out | Costo USD |
|---|---|---|---|---|
| alcance_preliminar | 10 | 16712 | 2619 | 0.0041 |
| sugerir_controles | 6 | 40191 | 3888 | 0.0084 |
| sugerir_riesgos | 5 | 23839 | 5302 | 0.0068 |
| documento_control | 4 | 12949 | 2950 | 0.0037 |
| plantilla_documento | 3 | 9200 | 2129 | 0.0027 |
| embedding | 2 | 86 | 0 | 0.0 |

### Cobertura por dominio

| Dominio | Escenarios |
|---|---|
| fisico | 4 |
| personas | 3 |
| organizacional | 2 |
| tecnologico | 1 |

### Frescura del índice (vector_global)

| Fuente | Chunks |
|---|---|
| base_mitre_attack_enterprise | 697 |
| base_iso_27002_controles | 321 |
| base_iso_27005_amenazas | 141 |
| base_mitre_attack_social_eng | 136 |
| base_enisa_threat_landscape | 93 |
| iso27001_2022 | 42 |
| base_enisa_amenazas_fisicas | 10 |
