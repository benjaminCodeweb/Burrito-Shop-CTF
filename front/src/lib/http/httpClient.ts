import axios from 'axios'

// El backend corre en un contenedor propio (docker-compose) pero publica su
// puerto al host, porque quien ejecuta este codigo es el navegador, no un
// contenedor de la red docker interna. VITE_API_URL permite overridearlo.
const baseUrl = import.meta.env.VITE_API_URL  || `${window.location.protocol}//${window.location.hostname}:3000`

export const httpClient = axios.create({
    baseURL: baseUrl,
    withCredentials: true,
})

