import axios, {AxiosError, AxiosRequestConfig, AxiosResponse} from "axios";

import {IApiRequest} from "../../../cshub-shared/src/models/IApiRequest";
import dataState from "../store/data";
import {Requests} from "../../../cshub-shared/src/api-calls";
import uiState from "../store/ui";
import userState from "../store/user";
import {Routes} from "../../../cshub-shared/src/Routes";
import {ServerError} from "../../../cshub-shared/src/models/ServerError";

const axiosApi = axios.create({
    baseURL: process.env.VUE_APP_API_URL || (window as any).appConfig.VUE_APP_API_URL,
    withCredentials: true,
    headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Version": process.env.VUE_APP_VERSION
    }
});

axiosApi.interceptors.request.use((config: AxiosRequestConfig) => {

    if (!dataState.hasConnection && config.url !== Requests.VERIFYTOKEN) {
        throw new axios.Cancel();
    } else {
        return config;
    }
});

axiosApi.interceptors.response.use((value: AxiosResponse<any>) => {
    return value;
}, (error: any) => {
    const forceRefreshButton = {
        text: "Force refresh",
        jsAction: () => {
            const promiseChain = caches.keys()
                .then((cacheNames) => {
                    // Step through each cache name and delete it
                    return Promise.all(
                        cacheNames.map((cacheName) => caches.delete(cacheName))
                    );
                })
                .then(() => {
                    window.location.reload(true);
                });
        }
    };

    if (error.response.status === 401) {
        const isLoggedIn = userState.isLoggedIn;
        const tokenVal = getCookie("token");

        const loggedOut = !isLoggedIn || tokenVal.length === 0;
        const button = loggedOut ? {
            text: "Log in",
            jsAction: () => {
                window.open(Routes.LOGIN, "_self");
            }
        } : null;

        uiState.setNotificationDialogState({
            on: true,
            header: `Unauthorized! ${error.response.status}`,
            text: `You are not authorized to do this! ${!loggedOut ? " Click the button below to log in." : ""}`,
            button
        });
    } else if (error.response.status === 404) {
        uiState.setNotificationDialogState({
            on: true,
            header: `404!`,
            text: "A 404 was 'caught' that you got on the server, we think the server might be restarting (okay we should cluster it so we can update better, but so far we didn't), so wait a sec or try force refresh!",
            button: forceRefreshButton
        });
    } else {
        const response = (error.response.data as ServerError);
        if (response.message !== null && typeof response.message !== "undefined") {

            const button = error.response.data.showRefresh ?  forceRefreshButton : null;

            uiState.setNotificationDialogState({
                on: true,
                header: `Error! ${error.response.status}`,
                text: response.message,
                button
            });
        } else {
            uiState.setNotificationDialogState({
                on: true,
                header: `Error! ${error.response.status}`,
                text: `The server experienced an error, but didn't provide an error message :(`
            });
        }

    }
});

export const getCookie = (name: string) => {
    const cookieWithPrependedSemi = `; ${document.cookie}`;
    const cookieParts = cookieWithPrependedSemi.split(`; ${name}=`);
    if (cookieParts.length === 2) {
        return cookieParts.pop().split(";").shift();
    } else {
        return "";
    }
};

export class ApiWrapper {

    public static sendPostRequest(request: IApiRequest, callback?: (...args: any) => void, error?: (err: AxiosError) => void) {
        axiosApi
            .post(request.URL, request, {
                withCredentials: true
            })
            .then((response: AxiosResponse<any>) => {
                if (callback) {
                    callback(response.data);
                }
            })
            .catch((err: AxiosError) => {
                if (error) {
                    error(err);
                }
            });
    }

    public static sendGetRequest(request: IApiRequest, callback?: (...args: any) => void, error?: (err: AxiosError) => void) {
        axiosApi
            .get(request.URL)
            .then((response: AxiosResponse<any>) => {
                if (callback) {
                    callback(response.data);
                }
            })
            .catch((err: AxiosError) => {
                if (error) {
                    error(err);
                }
            });
    }
}
