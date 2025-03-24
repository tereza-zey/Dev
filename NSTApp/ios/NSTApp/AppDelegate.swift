import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import FirebaseMessaging
import UserNotifications

@main
class AppDelegate: RCTAppDelegate, UNUserNotificationCenterDelegate, MessagingDelegate {
    
    override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        self.moduleName = "NSTApp"
        self.dependencyProvider = RCTAppDependencyProvider()
        
        // 1. Configurer Firebase en premier
        FirebaseApp.configure()
        
        // 2. Configurer les delegates de notification
        configureNotifications(application)
        
        // Props initiales pour React Native
        self.initialProps = [:]
        
        return super.application(application, didFinishLaunchingWithOptions: launchOptions)
    }
    
    private func configureNotifications(_ application: UIApplication) {
        // Configurer Messaging
        Messaging.messaging().delegate = self
        
        // Configurer les notifications
        UNUserNotificationCenter.current().delegate = self
        
        let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
        UNUserNotificationCenter.current().requestAuthorization(options: authOptions) { [weak self] granted, error in
            if let error = error {
                print("Erreur lors de la demande de permission notification : \(error.localizedDescription)")
                return
            }
            
            print("Permission notifications accordée: \(granted)")
            
            if granted {
                DispatchQueue.main.async {
                    application.registerForRemoteNotifications()
                }
            }
        }
    }
    
    // MARK: - Gestion des tokens
    
    override func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        //super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
        Messaging.messaging().apnsToken = deviceToken
    }
    
    func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        guard let fcmToken = fcmToken else { return }
        print("Token Firebase reçu: \(fcmToken)")
        
        // Envoyer le token à votre serveur si nécessaire
        let dataDict: [String: String] = ["token": fcmToken]
        NotificationCenter.default.post(
            name: Notification.Name("FCMToken"),
            object: nil,
            userInfo: dataDict
        )
    }
    
    // MARK: - Autres méthodes nécessaires
    
    override func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Échec de l'enregistrement aux notifications: \(error.localizedDescription)")
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                              willPresent notification: UNNotification,
                              withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.alert, .badge, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                              didReceive response: UNNotificationResponse,
                              withCompletionHandler completionHandler: @escaping () -> Void) {
        completionHandler()
    }
    
    // MARK: - Configuration React Native
    
    override func sourceURL(for bridge: RCTBridge) -> URL? {
        return self.bundleURL()
    }
    
    override func bundleURL() -> URL? {
        #if DEBUG
        return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
        #else
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
