# NavFuzz
Este proyecto ha sido desarrollado para la hackathon **Cyber Arena 2025 - Hackathon Interuniversitario de Ciberseguridad** organizado por la EUPT.

## Problema
En los ejercicios de auditoria de seguridad Web, es una práctica común el hacer FUZZING, que consiste en probar rutas en la URL para encontrar recursos comprometidos que no deberian estar visibles al público, ya que pueden ser vulnerabilidades o exponer datos confidenciales que pueden suponer grandes riesgos.

Las herramientas mas comunes, como pueden ser gobuster, ffuf o wfuzz no proveen de una interfaz gráfica que pueda permitir a un usuario hacer el fuzzing facilmente.

## Propuesta
Como solución se ha pensado en crear una extensión de navegador que pueda ser utilizada con simplemente acceder a la web y permita ajustar todos los parametros desde la propia interfaz del navegador.

Esta herramienta aunque no vaya a proporcionar las capacidades que tienen las anteriores por las limitaciones que ponen los navegadores, pretende ser una primera vista general sobre que archivos y puede haber en una pagina Web.

## Objetivos / TO-DO

- [x] Fetch a rutas de la pagina desde un diccionario hardcodeado.
- [x] Uso de un diccionario subido por el usuario o remoto.
- [x] Soporte para extensiones de archivo.
- [x] Web crawling.
- [ ] Recursividad en la busqueda de directorios.

## Uso

| Fuzzing | Detección de tecnologias | Configuración |
|---------|----------|----------|
| <img src="https://github.com/user-attachments/assets/f508f830-772d-40db-b419-90737c390a6a" width="250"> | <img src="https://github.com/user-attachments/assets/fca2d471-51d6-4e39-bbe8-030026b223bc" width="250"> | <img src="https://github.com/user-attachments/assets/626c54a4-b9bb-483f-8b92-2a6381c0fb6c" width="250"> |


