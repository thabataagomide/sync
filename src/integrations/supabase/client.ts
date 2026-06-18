import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type LocalUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

type LocalSession = {
  access_token: string;
  token_type: "bearer";
  user: LocalUser;
};

type LocalRecord = {
  id: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
};

const LOCAL_SESSION_KEY = "sync.local.session";
const LOCAL_DB_KEY = "sync.local.db";

/**
 * Fallback público do Supabase.
 * Essa chave é a Publishable Key, própria para uso no frontend.
 * Não coloque Secret Key aqui.
 */
const FALLBACK_SUPABASE_URL = "https://zacwhvlhfrnihoxgbsvm.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_6R0Qodr_b5FR2JLPfpjOVg_qciTglsc";

function createLocalSession(
  email: string,
  metadata: Record<string, unknown> = {}
): LocalSession {
  const safeEmail = email || "dev@local.test";

  return {
    access_token: "local-dev-token",
    token_type: "bearer",
    user: {
      id: "local-user",
      email: safeEmail,
      user_metadata: metadata,
    },
  };
}

function readLocalSession(): LocalSession | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(LOCAL_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
    return null;
  }
}

function saveLocalSession(session: LocalSession | null) {
  if (typeof window === "undefined") return;

  if (!session) {
    window.localStorage.removeItem(LOCAL_SESSION_KEY);
  } else {
    window.localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(session));
  }
}

function readLocalDb(): Record<string, LocalRecord[]> {
  if (typeof window === "undefined") return {};

  const raw = window.localStorage.getItem(LOCAL_DB_KEY);
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    window.localStorage.removeItem(LOCAL_DB_KEY);
    return {};
  }
}

function saveLocalDb(db: Record<string, LocalRecord[]>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
}

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createLocalQuery(table: string) {
  const filters: Array<{ column: string; value: any; operator: "eq" | "neq" }> =
    [];

  let orderColumn: string | null = null;
  let orderAscending = true;
  let limitCount: number | null = null;

  const applyFilters = (records: LocalRecord[]) => {
    let result = [...records];

    for (const filter of filters) {
      if (filter.operator === "eq") {
        result = result.filter((item) => item[filter.column] === filter.value);
      }

      if (filter.operator === "neq") {
        result = result.filter((item) => item[filter.column] !== filter.value);
      }
    }

    if (orderColumn) {
      result.sort((a, b) => {
        const av = a[orderColumn as string];
        const bv = b[orderColumn as string];

        if (av === bv) return 0;

        if (orderAscending) {
          return av > bv ? 1 : -1;
        }

        return av < bv ? 1 : -1;
      });
    }

    if (limitCount !== null) {
      result = result.slice(0, limitCount);
    }

    return result;
  };

  const executeSelect = async () => {
    const db = readLocalDb();
    const records = db[table] ?? [];

    return {
      data: applyFilters(records),
      error: null,
    };
  };

  const query: any = {
    select: () => query,

    insert: async (payload?: any) => {
      const db = readLocalDb();
      const current = db[table] ?? [];
      const now = new Date().toISOString();

      const items = Array.isArray(payload) ? payload : [payload];

      const created = items.map((item) => ({
        id: item?.id ?? createId(),
        created_at: item?.created_at ?? now,
        updated_at: item?.updated_at ?? now,
        ...item,
      }));

      db[table] = [...current, ...created];
      saveLocalDb(db);

      return {
        data: Array.isArray(payload) ? created : created[0],
        error: null,
      };
    },

    update: (payload?: any) => ({
      eq: async (column: string, value: any) => {
        const db = readLocalDb();
        const current = db[table] ?? [];
        const now = new Date().toISOString();

        db[table] = current.map((item) =>
          item[column] === value
            ? {
                ...item,
                ...payload,
                updated_at: now,
              }
            : item
        );

        saveLocalDb(db);

        return {
          data: db[table].filter((item) => item[column] === value),
          error: null,
        };
      },

      match: async (matchPayload: Record<string, any>) => {
        const db = readLocalDb();
        const current = db[table] ?? [];
        const now = new Date().toISOString();

        const matches = (item: LocalRecord) =>
          Object.entries(matchPayload).every(
            ([key, value]) => item[key] === value
          );

        db[table] = current.map((item) =>
          matches(item)
            ? {
                ...item,
                ...payload,
                updated_at: now,
              }
            : item
        );

        saveLocalDb(db);

        return {
          data: db[table].filter(matches),
          error: null,
        };
      },
    }),

    upsert: async (payload?: any) => {
      const db = readLocalDb();
      const current = db[table] ?? [];
      const now = new Date().toISOString();

      const items = Array.isArray(payload) ? payload : [payload];

      for (const item of items) {
        const id = item?.id ?? createId();
        const existingIndex = current.findIndex((record) => record.id === id);

        if (existingIndex >= 0) {
          current[existingIndex] = {
            ...current[existingIndex],
            ...item,
            id,
            updated_at: now,
          };
        } else {
          current.push({
            id,
            created_at: now,
            updated_at: now,
            ...item,
          });
        }
      }

      db[table] = current;
      saveLocalDb(db);

      return {
        data: Array.isArray(payload) ? items : items[0],
        error: null,
      };
    },

    delete: () => ({
      eq: async (column: string, value: any) => {
        const db = readLocalDb();
        const current = db[table] ?? [];

        db[table] = current.filter((item) => item[column] !== value);
        saveLocalDb(db);

        return {
          data: null,
          error: null,
        };
      },

      match: async (matchPayload: Record<string, any>) => {
        const db = readLocalDb();
        const current = db[table] ?? [];

        db[table] = current.filter(
          (item) =>
            !Object.entries(matchPayload).every(
              ([key, value]) => item[key] === value
            )
        );

        saveLocalDb(db);

        return {
          data: null,
          error: null,
        };
      },
    }),

    eq: (column: string, value: any) => {
      filters.push({ column, value, operator: "eq" });
      return query;
    },

    neq: (column: string, value: any) => {
      filters.push({ column, value, operator: "neq" });
      return query;
    },

    gte: () => query,
    lte: () => query,
    lt: () => query,
    gt: () => query,
    in: () => query,
    is: () => query,
    range: () => query,

    order: (column: string, options?: { ascending?: boolean }) => {
      orderColumn = column;
      orderAscending = options?.ascending ?? true;
      return query;
    },

    limit: (count: number) => {
      limitCount = count;
      return query;
    },

    single: async () => {
      const { data } = await executeSelect();

      return {
        data: data[0] ?? null,
        error: null,
      };
    },

    maybeSingle: async () => {
      if (table === "profiles") {
        const db = readLocalDb();
        const profiles = db.profiles ?? [];
        const existing = profiles.find((profile) => profile.id === "local-user");

        if (existing) {
          return {
            data: existing,
            error: null,
          };
        }

        const profile = {
          id: "local-user",
          user_id: "local-user",
          xp: 0,
          level: 1,
          sync_flow: 0,
          modules_enabled: {},
          theme: "midnight-sync",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        db.profiles = [...profiles, profile];
        saveLocalDb(db);

        return {
          data: profile,
          error: null,
        };
      }

      const { data } = await executeSelect();

      return {
        data: data[0] ?? null,
        error: null,
      };
    },

    then: (resolve: (value: { data: LocalRecord[]; error: null }) => void) =>
      executeSelect().then(resolve),
  };

  return query;
}

function createLocalSupabaseClient() {
  return {
    auth: {
      async getSession() {
        return {
          data: {
            session: readLocalSession(),
          },
          error: null,
        };
      },

      onAuthStateChange(
        callback: (_event: string, session: LocalSession | null) => void
      ) {
        const session = readLocalSession();

        setTimeout(() => {
          callback(session ? "SIGNED_IN" : "INITIAL_SESSION", session);
        }, 0);

        return {
          data: {
            subscription: {
              unsubscribe() {},
            },
          },
        };
      },

      async signInWithPassword({ email }: { email: string; password: string }) {
        const session = createLocalSession(email);
        saveLocalSession(session);

        return {
          data: {
            session,
            user: session.user,
          },
          error: null,
        };
      },

      async signUp({
        email,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, unknown> };
      }) {
        const session = createLocalSession(email, options?.data ?? {});
        saveLocalSession(session);

        return {
          data: {
            session,
            user: session.user,
          },
          error: null,
        };
      },

      async signInWithOAuth() {
        return {
          data: {
            url: null,
          },
          error: {
            message:
              "Modo local ativo. Configure o Supabase real para usar login com Google.",
          },
        };
      },

      async signOut() {
        saveLocalSession(null);

        return {
          error: null,
        };
      },
    },

    from: (table: string) => createLocalQuery(table),

    storage: {
      from() {
        return {
          async upload() {
            return {
              data: {
                path: "local-upload",
              },
              error: null,
            };
          },

          async createSignedUrl() {
            return {
              data: {
                signedUrl: "",
              },
              error: null,
            };
          },
        };
      },
    },

    functions: {
      async invoke() {
        return {
          data: {
            insight: "Modo local ativo. Conecte o Supabase para gerar insights reais.",
          },
          error: null,
        };
      },
    },
  };
}

function createSupabaseClient() {
  const USE_LOCAL_SUPABASE =
    import.meta.env.VITE_USE_LOCAL_SUPABASE === "true";

  if (USE_LOCAL_SUPABASE) {
    console.warn("[Supabase] VITE_USE_LOCAL_SUPABASE ativo. Usando modo local.");
    return createLocalSupabaseClient();
  }

  const SUPABASE_URL =
    import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;

  const SUPABASE_PUBLISHABLE_KEY =
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.warn(
      "[Supabase] Variáveis não configuradas. Usando login local de desenvolvimento."
    );

    return createLocalSupabaseClient();
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== "undefined" ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy(
  {} as ReturnType<typeof createSupabaseClient>,
  {
    get(_, prop, receiver) {
      if (!_supabase) _supabase = createSupabaseClient();
      return Reflect.get(_supabase, prop, receiver);
    },
  }
);