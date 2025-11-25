<architecture_analysis>
Na podstawie dostarczonej dokumentacji (`prd.md`, `auth-spec.md`) oraz analizy struktury kodu, przedstawiam analizę architektury UI dla modułu autentykacji.

### 1. Lista Komponentów i Stron

Zidentyfikowano następujące elementy, które są częścią lub zostaną utworzone w ramach modułu autentykacji:

**Strony (Astro):**
- `/src/pages/auth/login.astro`: Strona logowania (istniejąca jako `/signin.astro`).
- `/src/pages/auth/signup.astro`: Strona rejestracji (istniejąca jako `/signup.astro`).
- `/src/pages/auth/forgot-password.astro`: Strona do odzyskiwania hasła (nowa).
- `/src/pages/auth/update-password.astro`: Strona do aktualizacji hasła po odzyskaniu (nowa).
- `/src/pages/dashboard`: Główna strona aplikacji po zalogowaniu (chroniona).
- `/src/pages/wallets/[...slug].astro`: Strona szczegółów portfela (chroniona).

**Layouty (Astro):**
- `src/layouts/AuthLayout.astro`: Nowy layout dla stron autentykacji, o prostszej strukturze bez nawigacji aplikacji.
- `src/layouts/Layout.astro`: Główny layout aplikacji, który zostanie zaktualizowany, aby obsługiwać stan zalogowanego/niezalogowanego użytkownika. W dokumentacji nazwany `AppLayout.astro`.

**Komponenty (React):**
- `src/components/AuthForm.tsx`: Współdzielony, kliencki komponent formularza dla logowania i rejestracji.
- `src/components/AppHeader.tsx`: Istniejący komponent nagłówka, który zostanie zaktualizowany, aby dynamicznie pokazywać stan uwierzytelnienia (linki "Zaloguj", "Zarejestruj" lub email użytkownika i przycisk "Wyloguj").

**Logika Backendowa (API & Middleware):**
- `src/middleware/index.ts`: Middleware przechwytujący żądania, weryfikujący sesję użytkownika i chroniący trasy.
- `API Endpoints (/src/pages/api/auth/*)`: Zestaw endpointów do obsługi logiki rejestracji, logowania, wylogowywania i resetowania hasła.

### 2. Główne Strony i Ich Komponenty

- **Strony autentykacji (`/auth/*`):**
  - Używają `AuthLayout.astro`.
  - `login.astro` i `signup.astro` renderują komponent `AuthForm.tsx` z odpowiednim trybem (`'login'` lub `'signup'`).
  - `forgot-password.astro` i `update-password.astro` będą zawierać własne, dedykowane formularze React.

- **Strony chronione (`/dashboard`, `/wallets/*`):**
  - Używają `Layout.astro`.
  - Dostęp do nich jest kontrolowany przez `middleware/index.ts`.
  - `Layout.astro` renderuje zaktualizowany `AppHeader.tsx`, który otrzymuje informacje o sesji użytkownika.

### 3. Przepływ Danych

1.  **Użytkownik anonimowy:**
    - Wchodzi na stronę `/auth/login` lub `/auth/signup`.
    - `AuthForm.tsx` zarządza stanem formularza i walidacją po stronie klienta.
    - Po wysłaniu formularza, żądanie trafia do odpowiedniego endpointu API (`/api/auth/login` lub `/api/auth/signup`).
    - Endpoint API komunikuje się z Supabase, a w odpowiedzi ustawia w przeglądarce ciasteczka sesji (`HttpOnly`).
    - Po pomyślnej autentykacji, użytkownik jest przekierowywany na `/dashboard`.

2.  **Użytkownik zalogowany:**
    - Gdy próbuje uzyskać dostęp do dowolnej strony, `middleware/index.ts` jest uruchamiany.
    - Middleware odczytuje ciasteczka sesji, weryfikuje je w Supabase i umieszcza dane użytkownika w `Astro.locals.user`.
    - Jeśli użytkownik próbuje wejść na stronę chronioną (np. `/dashboard`), middleware pozwala na dostęp.
    - Jeśli użytkownik próbuje wejść na stronę logowania (`/auth/login`), middleware przekierowuje go na `/dashboard`.
    - Dane o użytkowniku z `Astro.locals` są przekazywane do `Layout.astro`, a następnie do `AppHeader.tsx`, który renderuje odpowiedni widok.

### 4. Opis Funkcjonalności Komponentów

- **`AuthLayout.astro`**: Zapewnia minimalistyczny interfejs dla formularzy, skupiając uwagę użytkownika na procesie logowania/rejestracji.
- **`Layout.astro`**: Główny szablon aplikacji, zawiera nawigację i stopkę; dostosowuje `AppHeader` do stanu sesji.
- **`AuthForm.tsx`**: Centralizuje logikę formularzy logowania i rejestracji, w tym walidację i komunikację z API. Zmniejsza duplikację kodu.
- **`AppHeader.tsx`**: Działa jako główny punkt nawigacyjny i wskaźnik stanu sesji użytkownika.
- **`middleware/index.ts`**: Pełni rolę strażnika aplikacji, chroniąc zasoby i zarządzając sesją na poziomie serwera przy każdym żądaniu.

</architecture_analysis>

<mermaid_diagram>
```mermaid
flowchart TD
    classDef newComponent fill:#cce5ff,stroke:#367dff,stroke-width:2px;
    classDef updatedComponent fill:#fff2cc,stroke:#ffb833,stroke-width:2px;
    classDef page fill:#e5ffe5,stroke:#00b300,stroke-width:1px;
    classDef layout fill:#f0e6ff,stroke:#9966ff,stroke-width:1px;
    classDef backend fill:#ffe6e6,stroke:#ff3333,stroke-width:1px;
    classDef external fill:#d9d9d9,stroke:#666,stroke-width:1px;

    subgraph "Przeglądarka Użytkownika"
        direction LR
        subgraph "Strony Publiczne (Autentykacja)"
            direction TB
            P_Login["/auth/login.astro"]:::page
            P_Signup["/auth/signup.astro"]:::page
            P_Forgot["/auth/forgot-password.astro"]:::page
            P_Update["/auth/update-password.astro"]:::page
        end
        
        subgraph "Strony Chronione"
            direction TB
            P_Dashboard["/dashboard"]:::page
            P_Wallets["/wallets/[id]"]:::page
        end
        
        subgraph "Komponenty UI (React)"
            direction TB
            C_AuthForm["AuthForm.tsx"]:::newComponent
            C_AppHeader["AppHeader.tsx"]:::updatedComponent
        end
        
        subgraph "Layouty (Astro)"
            direction TB
            L_Auth["AuthLayout.astro"]:::newComponent
            L_App["Layout.astro"]:::updatedComponent
        end
    end

    subgraph "Infrastruktura Backend"
        direction TB
        B_Middleware["Middleware (index.ts)"]:::backend
        
        subgraph "API Endpoints"
            direction TB
            API_Login["POST /api/auth/login"]:::backend
            API_Signup["POST /api/auth/signup"]:::backend
            API_Logout["POST /api/auth/logout"]:::backend
            API_Forgot["POST /api/auth/forgot-password"]:::backend
        end
        
        Ext_Supabase["Supabase Auth"]:::external
    end
    
    %% Relacje
    P_Login -- Używa --> L_Auth
    P_Signup -- Używa --> L_Auth
    P_Forgot -- Używa --> L_Auth
    P_Update -- Używa --> L_Auth
    
    P_Dashboard -- Używa --> L_App
    P_Wallets -- Używa --> L_App
    
    L_Auth -- Renderuje --> C_AuthForm
    L_App -- Renderuje --> C_AppHeader
    
    C_AuthForm -- Wysyła dane --> API_Login
    C_AuthForm -- Wysyła dane --> API_Signup
    
    P_Login -- Dostęp kontrolowany przez --> B_Middleware
    P_Signup -- Dostęp kontrolowany przez --> B_Middleware
    P_Dashboard -- Dostęp kontrolowany przez --> B_Middleware
    P_Wallets -- Dostęp kontrolowany przez --> B_Middleware
    
    B_Middleware -- Weryfikuje sesję w --> Ext_Supabase
    
    API_Login -- Komunikuje się z --> Ext_Supabase
    API_Signup -- Komunikuje się z --> Ext_Supabase
    API_Logout -- Komunikuje się z --> Ext_Supabase
    API_Forgot -- Komunikuje się z --> Ext_Supabase
    
    C_AppHeader -- Wywołuje --> API_Logout
    
    B_Middleware -- Przekierowuje do --> P_Login
    API_Login -- Ustawia Ciasteczka Sesji --> Przeglądarka
    API_Signup -- Ustawia Ciasteczka Sesji --> Przeglądarka
```
</mermaid_diagram>
