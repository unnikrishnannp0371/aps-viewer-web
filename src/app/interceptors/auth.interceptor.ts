import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from "@angular/common/http";
import { inject } from "@angular/core";
import { Router } from "@angular/router";
import { catchError, throwError } from "rxjs";

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
) => {
    const router = inject(Router)

    const authReq = req.clone({ withCredentials: true });

    return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                const currentUrl = router.url;
                if (currentUrl && currentUrl !== '/login'){
                    sessionStorage.setItem("redirectUrl", currentUrl);
                }
                router.navigate(["/login"]);
            }
            return throwError(() => error);
        })
    )
}
