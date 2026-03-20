import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import LoadingSpinner from '../../components/LoadingSpinner';
import ExpiryCountdown from '../../components/ExpiryCountdown';
import { getSocket } from '../../services/socket';

function StatusTag({ status }) {
  const map = {
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
    accepted: { label: 'Accepted', cls: 'bg-teal-100 text-teal-800 border border-teal-200' },
    picked: { label: 'Picked', cls: 'bg-orange-100 text-orange-800 border border-orange-200' },
    delivered: { label: 'Delivered', cls: 'bg-forest-100 text-forest-800 border border-forest-200' },
  };
  const v = map[status] || { label: status || '—', cls: 'bg-stone-100 text-stone-600 border border-stone-200' };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${v.cls}`}>{v.label}</span>;
}

export default function VolunteerDashboard() {
  const [availableTasks, setAvailableTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [availableRes, myRes] = await Promise.all([
        api.get('/volunteer/tasks/available'),
        api.get('/volunteer/tasks/my'),
      ]);
      setAvailableTasks(Array.isArray(availableRes.data) ? availableRes.data : []);
      setMyTasks(Array.isArray(myRes.data) ? myRes.data : []);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to load volunteer tasks');
      setAvailableTasks([]);
      setMyTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const nextStatusForButton = (taskStatus) => {
    if (taskStatus === 'accepted') return 'picked';
    if (taskStatus === 'picked') return 'delivered';
    return null;
  };

  const actionLabelForStatus = (nextStatus) => {
    if (nextStatus === 'picked') return 'Mark Picked';
    if (nextStatus === 'delivered') return 'Mark Delivered';
    return '';
  };

  const handleStatusUpdate = async (task) => {
    const nextStatus = nextStatusForButton(task.status);
    if (!nextStatus) return;

    setUpdatingId(task._id);
    try {
      await api.put(`/volunteer/task/${task._id}/status`, { status: nextStatus });
      toast.success(nextStatus === 'picked' ? 'Marked as picked' : 'Delivery completed 🎉');
      await fetchTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleAccept = async (taskId) => {
    setUpdatingId(taskId);
    try {
      await api.post(`/volunteer/task/${taskId}/accept`);
      toast.success('Task accepted!');
      await fetchTasks();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to accept task');
    } finally {
      setUpdatingId(null);
    }
  };

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();

    const onNewTask = (task) => {
      setAvailableTasks((prev) => {
        if (prev.some((t) => t._id === task._id)) return prev;
        return [task, ...prev];
      });
    };

    const onTaskAccepted = (task) => {
      setAvailableTasks((prev) => prev.filter((t) => t._id !== task._id));
    };

    const onTaskUpdated = (task) => {
      setMyTasks((prev) => {
        const exists = prev.some((t) => t._id === task._id);
        if (!exists) return prev;
        return prev.map((t) => (t._id === task._id ? task : t));
      });
    };

    const onDeliveryCompleted = ({ task }) => {
      setMyTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    };

    socket.on('newTaskAvailable', onNewTask);
    socket.on('taskAccepted', onTaskAccepted);
    socket.on('taskUpdated', onTaskUpdated);
    socket.on('deliveryCompleted', onDeliveryCompleted);

    return () => {
      socket.off('newTaskAvailable', onNewTask);
      socket.off('taskAccepted', onTaskAccepted);
      socket.off('taskUpdated', onTaskUpdated);
      socket.off('deliveryCompleted', onDeliveryCompleted);
    };
  }, []);

  if (loading) return <LoadingSpinner text="Loading volunteer tasks..." />;

  return (
    <div className="space-y-6 animate-slide-up">
      <div>
        <h2 className="font-display text-2xl font-bold text-stone-800">Volunteer Mode</h2>
        <p className="text-stone-500 text-sm mt-1">Transport food from provider to seeker.</p>
      </div>

      {/* Available Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-800 text-sm">Available Tasks</h3>
          <span className="text-xs text-stone-400">
            {availableTasks.length} open
          </span>
        </div>
        {availableTasks.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">No pending tasks right now</p>
        ) : (
          <div className="space-y-3">
            {availableTasks.map((task) => {
              const seekerLat = task.seekerId?.lastLat;
              const seekerLng = task.seekerId?.lastLng;
              const hasDropCoords = Number.isFinite(seekerLat) && Number.isFinite(seekerLng);

              return (
                <div
                  key={task._id}
                  className="p-3 rounded-xl border border-stone-100 bg-stone-50/60 flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800 text-sm">{task.foodId?.foodName || 'Food'}</p>
                      <div className="mt-1 space-y-1 text-xs text-stone-500">
                        <p>📍 Pickup: {task.foodId?.location || '—'}</p>
                        <p>
                          🧭 Drop:{' '}
                          {hasDropCoords
                            ? `${seekerLat.toFixed(3)}, ${seekerLng.toFixed(3)}`
                            : 'Location unavailable'}
                        </p>
                        <div className="pt-1">
                          {/* {task.foodId?.expiryTime ? (
                            <ExpiryCountdown expiryTime={task.foodId.expiryTime} />
                          ) : (
                            <span className="text-[11px] text-stone-400">Expires in: —</span>
                          )} */}
                        </div>
                      </div>
                    </div>
                    <StatusTag status={task.status} />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAccept(task._id)}
                    disabled={updatingId === task._id}
                    className="btn-primary text-xs py-2 mt-1"
                  >
                    {updatingId === task._id ? 'Accepting...' : 'Accept Task'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Tasks */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-stone-800 text-sm">My Tasks</h3>
          <span className="text-xs text-stone-400">
            {myTasks.length} assigned
          </span>
        </div>
        {myTasks.length === 0 ? (
          <p className="text-xs text-stone-400 py-4 text-center">You have no active tasks</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {myTasks.map((task) => {
              const canAct = task.status === 'accepted' || task.status === 'picked';
              const nextStatus = nextStatusForButton(task.status);
              const actionLabel = nextStatus ? actionLabelForStatus(nextStatus) : '';
              const seekerLat = task.seekerId?.lastLat;
              const seekerLng = task.seekerId?.lastLng;

              const hasDropCoords = Number.isFinite(seekerLat) && Number.isFinite(seekerLng);

              return (
                <div
                  key={task._id}
                  className="card p-4 hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-stone-800">{task.foodId?.foodName || 'Food'}</p>
                      <div className="mt-1 space-y-1 text-xs text-stone-500">
                        <p>📍 Pickup: {task.foodId?.location || '—'}</p>
                        <p>
                          🧭 Drop:{' '}
                          {hasDropCoords
                            ? `${seekerLat.toFixed(3)}, ${seekerLng.toFixed(3)}`
                            : 'Location unavailable'}
                        </p>
                        <div className="pt-1">
                          {/* {task.foodId?.expiryTime ? (
                            <ExpiryCountdown expiryTime={task.foodId.expiryTime} />
                          ) : (
                            <span className="text-[11px] text-stone-400">Expires in: —</span>
                          )} */}
                        </div>
                      </div>
                    </div>
                    <StatusTag status={task.status} />
                  </div>

                  {canAct && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate(task)}
                        disabled={updatingId === task._id}
                        className="btn-primary text-sm py-2 flex-1"
                      >
                        {updatingId === task._id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Updating...
                          </span>
                        ) : (
                          actionLabel
                        )}
                      </button>
                    </div>
                  )}

                  {task.status === 'delivered' && (
                    <p className="text-xs text-stone-400 mt-3">Delivery workflow completed.</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

