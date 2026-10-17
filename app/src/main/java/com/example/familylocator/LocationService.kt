package com.example.familylocator

import android.annotation.SuppressLint
import android.app.*
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import com.google.android.gms.location.*
import kotlinx.coroutines.*

class LocationService : Service() {
    private lateinit var client: FusedLocationProviderClient
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val startTs = System.currentTimeMillis()

    private var places = listOf<Place>()
    private val inside = mutableMapOf<String, Boolean>()
    private val notified = HashSet<String>()
    private var lastHist: Triple<Double, Double, Long>? = null
    private var notifId = 100

    private val callback = object : LocationCallback() {
        override fun onLocationResult(r: LocationResult) {
            r.lastLocation?.let { l -> scope.launch { runCatching { handle(l) } } }
        }
    }

    private suspend fun handle(l: Location) {
        Repo.pushLocation(l.latitude, l.longitude)

        // history: write when moved >= 20 m or every 2 minutes
        val now = System.currentTimeMillis()
        val h = lastHist
        val moved = h?.let {
            val out = FloatArray(1)
            Location.distanceBetween(it.first, it.second, l.latitude, l.longitude, out); out[0]
        } ?: Float.MAX_VALUE
        if (h == null || moved >= 20f || now - h.third >= 120_000) {
            Repo.pushHistory(l.latitude, l.longitude)
            lastHist = Triple(l.latitude, l.longitude, now)
        }

        // geofences: compare inside/outside with previous state (first fix is silent)
        for (p in places) {
            val out = FloatArray(1)
            Location.distanceBetween(l.latitude, l.longitude, p.lat, p.lng, out)
            val isIn = out[0] <= p.radius
            val prev = inside[p.id]
            if (prev != null && prev != isIn) Repo.addEvent(p, if (isIn) "enter" else "exit")
            inside[p.id] = isIn
        }
    }

    @SuppressLint("MissingPermission")
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(NotificationManager::class.java)
        nm.createNotificationChannel(NotificationChannel("loc", "Location sharing", NotificationManager.IMPORTANCE_LOW))
        nm.createNotificationChannel(NotificationChannel("alerts", "Place alerts", NotificationManager.IMPORTANCE_HIGH))
        val n = NotificationCompat.Builder(this, "loc")
            .setContentTitle("Sharing your location with your family")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation).setOngoing(true).build()
        ServiceCompat.startForeground(this, 1, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)

        client = LocationServices.getFusedLocationProviderClient(this)
        val req = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, 15_000)
            .setMinUpdateDistanceMeters(10f).build()
        client.requestLocationUpdates(req, callback, mainLooper)

        scope.launch {
            val c = runCatching { Repo.myCircleId() }.getOrNull() ?: return@launch
            launch { Repo.places(c).collect { places = it } }
            launch {
                Repo.events(c).collect { list ->
                    list.filter { it.ts > startTs && it.uid != Repo.myUid && notified.add(it.id) }
                        .forEach { e ->
                            val note = NotificationCompat.Builder(this@LocationService, "alerts")
                                .setContentTitle("Place alert").setContentText(e.text())
                                .setSmallIcon(android.R.drawable.ic_dialog_map).setAutoCancel(true).build()
                            nm.notify(notifId++, note)
                        }
                }
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        if (::client.isInitialized) client.removeLocationUpdates(callback)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(i: Intent?): IBinder? = null
}
