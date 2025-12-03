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
- [ ] Uso de un diccionario subido por el usuario o remoto.
- [ ] Soporte para extensiones de archivo.
- [ ] Web crawling.
- [ ] Recursividad en la busqueda de directorios.

## Uso

Aqui irán imagenes de la aplicacion y apartados.
