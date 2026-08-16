import DriverConsole from '../components/custom/DriverConsole';

const DriverConsolePage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Driver Console</h1>
        <p className="text-sm text-slate-500">
          Push status and location updates to customers in real time.
        </p>
      </div>
      <DriverConsole />
    </div>
  );
};

export default DriverConsolePage;

