package middleware

import (
	"net/http"
	"server-go/pkg/response"
)

// AuthorizeRole returns a middleware that checks if the user's role is in the allowed list
func AuthorizeRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userRole, ok := r.Context().Value(UserRoleKey).(string)
			if !ok || userRole == "" {
				response.Error(w, http.StatusUnauthorized, "Unauthorized access")
				return
			}

			isAllowed := false
			for _, role := range allowedRoles {
				if userRole == role {
					isAllowed = true
					break
				}
			}

			if !isAllowed {
				response.Error(w, http.StatusForbidden, "You do not have access rights (role) for this action")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
