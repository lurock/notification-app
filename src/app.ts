import {Component} from 'angular2/core';
import {Http, RequestOptionsArgs, Headers} from 'angular2/http';
import 'rxjs/operator/map';

@Component({
    selector: 'app',
    moduleId: module.id,
    templateUrl: 'app.html'
})
export class AppComponent {
    isPushEnabled = false;
    buttonDisabled = false;
    buttonText = 'Enable Push Messages';
    endpoint = 'https://android.googleapis.com/gcm/send';

    constructor(private _http: Http) {
        // Check that service workers are supported, if so, progressively  
        // enhance and add push messaging support, otherwise continue without it.  
        if ('serviceWorker' in navigator) {
            (<any>navigator).serviceWorker.register('/service-worker.js')
                .then(() => this.initialiseState());
        } else {
            console.warn('Service workers aren\'t supported in this browser.');
        }
    }
    
    testNotification() {
        var headers = new Headers([ {'Content-Type': 'application/json'}, {'Origin': 'https://notification-app.azurewebsites.net'}]);
        var options: RequestOptionsArgs = {headers: headers};
        var registrationId = window.localStorage.getItem('registrationId');
        this._http.post("http://notification-server.azurewebsites.net/api/PushNotifications", '"' + registrationId + '"', options).subscribe((observer) => {
            console.log(observer);
        });
    }

    subscribeOrUnsubscribe() {
        if (this.isPushEnabled) {
            //unsubscribe();
        } else {
            this.subscribe();
        }
    }
    
    // Once the service worker is registered set the initial state  
    initialiseState() {  
        
        // Are Notifications supported in the service worker?  
        if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
            console.warn('Notifications aren\'t supported.');
            return;
        }

        // Check the current Notification permission.  
        // If its denied, it's a permanent block until the  
        // user changes the permission  
        if (Notification.permission === 'denied') {
            console.warn('The user has blocked notifications.');
            return;
        }

        // Check if push messaging is supported  
        if (!('PushManager' in window)) {
            console.warn('Push messaging isn\'t supported.');
            return;
        }

        // We need the service worker registration to check for a subscription  
        navigator.serviceWorker.ready.then((serviceWorkerRegistration) => {  
            // Do we already have a push message subscription?  
            serviceWorkerRegistration.pushManager.getSubscription()
                .then((subscription) => {  
                    // Enable any UI which subscribes / unsubscribes from  
                    // push messages.  
                    this.buttonDisabled = false;

                    if (!subscription) {  
                        // We aren't subscribed to push, so set UI  
                        // to allow the user to enable push  
                        return;
                    }

                    // Keep your server in sync with the latest subscriptionId
                    //sendSubscriptionToServer(subscription);
                    this.saveToken(subscription);
                    console.log('Subscription:');
                    console.log(subscription);

                    // Set your UI to show they have subscribed for  
                    // push messages  
                    this.buttonDisabled = true;
                })
                .catch((err) => {
                    console.warn('Error during getSubscription()', err);
                });
        });
    }

    subscribe() {  
        // Disable the button so it can't be changed while  
        // we process the permission request  
        this.buttonDisabled = true;

        (<any>navigator).serviceWorker.ready.then((serviceWorkerRegistration) => {
            serviceWorkerRegistration.pushManager.subscribe({ userVisibleOnly: true })
                .then((subscription) => {  
                    // The subscription was successful  
                    this.isPushEnabled = true;
                    this.buttonText = 'Disable Push Messages';
                    this.buttonDisabled = false;

                    console.log('Subscription:');
                    console.log(subscription);
                    // TODO: Send the subscription.endpoint to your server  
                    // and save it to send a push message at a later date
                    //return sendSubscriptionToServer(subscription);
                    this.saveToken(subscription);
                })
                .catch((e) => {
                    if (Notification.permission === 'denied') {  
                        // The user denied the notification permission which  
                        // means we failed to subscribe and the user will need  
                        // to manually change the notification permission to  
                        // subscribe to push messages  
                        console.warn('Permission for Notifications was denied');
                        this.buttonDisabled = true;
                    } else {  
                        // A problem occurred with the subscription; common reasons  
                        // include network errors, and lacking gcm_sender_id and/or  
                        // gcm_user_visible_only in the manifest.  
                        console.error('Unable to subscribe to push.', e);
                        this.buttonDisabled = false;
                        this.buttonText = 'Enable Push Messages';
                    }
                });
        });
    }

    saveToken(subscription) {
        if (subscription.endpoint.indexOf(this.endpoint) === 0) {
            var subscriptionParts = subscription.endpoint.split('/')
            var registrationId = subscriptionParts[subscriptionParts.length - 1];
            window.localStorage.setItem('registrationId', registrationId);
            document.querySelector('#token').textContent = registrationId;
        }
    }
}