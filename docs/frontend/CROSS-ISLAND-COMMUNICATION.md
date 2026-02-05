# Cross-Island Communication in Astro

This document explains how to share state between separate React islands in Astro's hybrid rendering architecture.

## The Problem

Astro uses an "islands architecture" where interactive React components are hydrated independently. When you have multiple React components rendered with `client:load`, `client:visible`, etc., each becomes a **separate React tree** with:

- Its own React root
- Its own context providers
- Potentially its own module instances (due to Vite bundling)

This means **TanStack Query cache updates in one island won't propagate to another island**, even if they import the same `queryClient` singleton.

### Example: Avatar Upload

```
┌─────────────────────────────────────────────────────────┐
│ DashboardLayout.astro                                   │
│                                                         │
│  ┌─────────────────┐    ┌─────────────────────────────┐ │
│  │ UserMenu        │    │ SettingsView                │ │
│  │ (client:load)   │    │ (client:load)               │ │
│  │                 │    │                             │ │
│  │ ┌─────────────┐ │    │ ┌─────────────────────────┐ │ │
│  │ │QueryProvider│ │    │ │QueryProvider            │ │ │
│  │ │  (Island 1) │ │    │ │  (Island 2)             │ │ │
│  │ │             │ │    │ │                         │ │ │
│  │ │ useSession()│ │    │ │ useUploadAvatar()       │ │ │
│  │ └─────────────┘ │    │ └─────────────────────────┘ │ │
│  └─────────────────┘    └─────────────────────────────┘ │
│                                                         │
│  ❌ setQueryData() in Island 2 won't update Island 1    │
└─────────────────────────────────────────────────────────┘
```

## The Solution: DOM CustomEvents + Local State

Use browser-native `CustomEvent` for cross-island communication, combined with local React state for guaranteed re-renders.

### Step 1: Dispatch Event from Source

In the mutation hook that changes shared state:

```typescript
// hooks/use-user.ts
export function useUploadAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      // ... upload logic
    },
    onSuccess: (data) => {
      // Update local island's cache (for components in same island)
      queryClient.setQueryData(authKeys.session(), (oldData) => ({
        ...oldData,
        user: { ...oldData.user, image: data.data.url },
      }));
      
      // Dispatch event for OTHER islands
      window.dispatchEvent(
        new CustomEvent('user-avatar-changed', { 
          detail: { url: data.data.url } 
        })
      );
    },
  });
}
```

### Step 2: Listen in Consuming Component

In the component that needs to react to changes from other islands:

```typescript
// components/dashboard/UserMenu.tsx
function UserMenuContent() {
  const { data: session } = useSession();
  
  // Local state for cross-island updates (guarantees re-render)
  const [avatarOverride, setAvatarOverride] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const handleAvatarChange = (event: CustomEvent<{ url: string | null }>) => {
      setAvatarOverride(event.detail.url);
    };

    window.addEventListener('user-avatar-changed', handleAvatarChange as EventListener);
    return () => {
      window.removeEventListener('user-avatar-changed', handleAvatarChange as EventListener);
    };
  }, []);

  // Use override if set, otherwise fall back to session data
  const avatarUrl = avatarOverride !== undefined ? avatarOverride : session?.user?.image;
  
  return (
    <Avatar key={avatarUrl || 'no-avatar'}>
      {avatarUrl && <AvatarImage src={avatarUrl} />}
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  );
}
```

### Why This Works

| Approach | Works Across Islands? | Guarantees Re-render? |
|----------|----------------------|----------------------|
| TanStack Query `setQueryData` | ❌ No (separate contexts) | ❌ No |
| TanStack Query `invalidateQueries` | ❌ No (separate contexts) | ❌ No |
| Nanostores | ✅ Yes (module-level) | ✅ Yes |
| DOM CustomEvent + useState | ✅ Yes (browser-native) | ✅ Yes |

We chose **DOM CustomEvent + useState** because:
1. **Browser-native**: Works across any JavaScript boundaries
2. **No dependencies**: Doesn't require additional libraries
3. **Explicit**: Clear what data is being shared and when
4. **Type-safe**: CustomEvent can be typed with generics

## Event Naming Convention

Use kebab-case with a descriptive prefix:

```typescript
// Format: {entity}-{action}
'user-avatar-changed'
'user-profile-updated'
'event-created'
'guest-invited'
```

## TypeScript Types

Define event types for type safety:

```typescript
// types/events.ts
declare global {
  interface WindowEventMap {
    'user-avatar-changed': CustomEvent<{ url: string | null }>;
    'user-profile-updated': CustomEvent<{ name: string; email: string }>;
  }
}

export {};
```

Then you can remove the `as EventListener` cast:

```typescript
window.addEventListener('user-avatar-changed', handleAvatarChange);
```

## Alternative: Nanostores

For more complex cross-island state, consider [Nanostores](https://github.com/nanostores/nanostores) which is already configured in this project:

```typescript
// stores/user.ts
import { atom } from 'nanostores';

export const $userAvatar = atom<string | null>(null);

// In mutation
$userAvatar.set(newUrl);

// In component
import { useStore } from '@nanostores/react';
const avatarUrl = useStore($userAvatar);
```

Nanostores works across islands because it stores state at the module level, not in React context.

## When to Use Each Approach

| Scenario | Recommended Approach |
|----------|---------------------|
| Simple one-way updates (like avatar) | DOM CustomEvent + useState |
| Complex shared state | Nanostores |
| State only within one island | TanStack Query |
| Server state with caching | TanStack Query (within island) |

## Files Using This Pattern

- `frontend/src/hooks/use-user.ts` - Dispatches `user-avatar-changed` event
- `frontend/src/components/dashboard/UserMenu.tsx` - Listens for avatar changes
